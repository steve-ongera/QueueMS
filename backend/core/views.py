from django.utils import timezone
from django.db.models import Avg, Count, Q
from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
import re

from .models import User, Queue, QueueTicket, ServiceCounter, Notification, ChatMessage
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    QueueSerializer, QueueTicketSerializer, JoinQueueSerializer,
    ServiceCounterSerializer, NotificationSerializer,
    ChatMessageSerializer, DashboardStatsSerializer
)


# ─── AUTH ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    request.user.auth_token.delete()
    return Response({'message': 'Logged out successfully.'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


# ─── DASHBOARD ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    today = timezone.now().date()
    queues = Queue.objects.all()
    stats = {
        'total_queues': queues.count(),
        'total_waiting': QueueTicket.objects.filter(status='waiting').count(),
        'total_serving': QueueTicket.objects.filter(status='serving').count(),
        'total_completed_today': QueueTicket.objects.filter(
            status='completed',
            completed_at__date=today
        ).count(),
        'active_counters': ServiceCounter.objects.filter(is_active=True).count(),
        'avg_wait_time': Queue.objects.aggregate(
            avg=Avg('avg_service_time'))['avg'] or 0,
        'queues': queues,
    }
    serializer = DashboardStatsSerializer(stats)
    return Response(serializer.data)


# ─── QUEUE VIEWSET ────────────────────────────────────────────────────────────

class QueueViewSet(viewsets.ModelViewSet):
    queryset = Queue.objects.all()
    serializer_class = QueueSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def tickets(self, request, pk=None):
        queue = self.get_object()
        tickets = queue.tickets.filter(
            status__in=['waiting', 'serving']
        ).order_by('priority', 'token_number')
        serializer = QueueTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def call_next(self, request, pk=None):
        """Staff: call the next customer"""
        queue = self.get_object()
        counter_id = request.data.get('counter_id')

        # Complete current serving ticket if any
        QueueTicket.objects.filter(
            queue=queue, status='serving'
        ).update(status='completed', completed_at=timezone.now())

        # Get next waiting ticket
        next_ticket = queue.tickets.filter(status='waiting').order_by(
            'priority', 'token_number'
        ).first()

        if not next_ticket:
            return Response({'message': 'No more customers waiting.'}, status=200)

        next_ticket.status = 'serving'
        next_ticket.called_at = timezone.now()
        if counter_id:
            try:
                next_ticket.counter = ServiceCounter.objects.get(id=counter_id)
            except ServiceCounter.DoesNotExist:
                pass
        next_ticket.save()

        # Create notification for the customer
        if next_ticket.customer:
            Notification.objects.create(
                user=next_ticket.customer,
                title='Your turn!',
                message=f'Token {next_ticket.token_display} — please proceed to '
                        f'{next_ticket.counter.name if next_ticket.counter else "the counter"}.',
                type='success'
            )

        return Response(QueueTicketSerializer(next_ticket).data)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        queue = self.get_object()
        queue.status = 'paused' if queue.status == 'open' else 'open'
        queue.save()
        return Response(QueueSerializer(queue).data)


# ─── TICKET VIEWSET ───────────────────────────────────────────────────────────

class QueueTicketViewSet(viewsets.ModelViewSet):
    serializer_class = QueueTicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'staff']:
            return QueueTicket.objects.all()
        return QueueTicket.objects.filter(customer=user)

    @action(detail=False, methods=['post'])
    def join(self, request):
        serializer = JoinQueueSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        try:
            queue = Queue.objects.get(id=data['queue_id'])
        except Queue.DoesNotExist:
            return Response({'error': 'Queue not found.'}, status=404)

        if queue.status != 'open':
            return Response({'error': 'Queue is not accepting customers right now.'}, status=400)

        if queue.waiting_count >= queue.max_capacity:
            return Response({'error': 'Queue is at full capacity.'}, status=400)

        # Generate next token number
        last = queue.tickets.order_by('-token_number').first()
        token_number = (last.token_number + 1) if last else 1
        token_display = f"{queue.prefix}-{str(token_number).zfill(3)}"

        ticket = QueueTicket.objects.create(
            queue=queue,
            customer=request.user if not request.user.is_anonymous else None,
            customer_name=data.get('customer_name', request.user.get_full_name()),
            customer_phone=data.get('customer_phone', ''),
            token_number=token_number,
            token_display=token_display,
            priority=data.get('priority', 'normal'),
            notes=data.get('notes', ''),
        )

        # Notify customer
        if ticket.customer:
            Notification.objects.create(
                user=ticket.customer,
                title='Joined Queue',
                message=f'Your token is {token_display}. '
                        f'Estimated wait: ~{ticket.estimated_wait} minutes. '
                        f'Position: {ticket.position + 1}',
                type='info'
            )

        return Response(QueueTicketSerializer(ticket).data, status=201)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status not in ['waiting']:
            return Response({'error': 'Cannot cancel this ticket.'}, status=400)
        ticket.status = 'cancelled'
        ticket.save()
        return Response(QueueTicketSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Staff marks service as complete"""
        ticket = self.get_object()
        ticket.status = 'completed'
        ticket.completed_at = timezone.now()
        ticket.save()
        return Response(QueueTicketSerializer(ticket).data)

    @action(detail=False, methods=['get'])
    def my_tickets(self, request):
        tickets = QueueTicket.objects.filter(
            customer=request.user,
            status__in=['waiting', 'serving']
        )
        return Response(QueueTicketSerializer(tickets, many=True).data)


# ─── SERVICE COUNTER VIEWSET ──────────────────────────────────────────────────

class ServiceCounterViewSet(viewsets.ModelViewSet):
    queryset = ServiceCounter.objects.all()
    serializer_class = ServiceCounterSerializer
    permission_classes = [IsAuthenticated]


# ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications(request):
    notifs = Notification.objects.filter(user=request.user)[:30]
    return Response(NotificationSerializer(notifs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, pk):
    try:
        notif = Notification.objects.get(id=pk, user=request.user)
        notif.is_read = True
        notif.save()
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


# ─── CHATBOT ─────────────────────────────────────────────────────────────────

def chatbot_response(user, message):
    """Rule-based NLP chatbot for queue queries"""
    msg = message.lower().strip()
    intent = 'unknown'
    response = "I'm not sure how to help with that. Try asking about your queue position or wait time."

    # Intent: check position
    if any(k in msg for k in ['position', 'number', 'where am i', 'my place', 'turn']):
        intent = 'check_position'
        tickets = QueueTicket.objects.filter(
            customer=user, status__in=['waiting', 'serving']
        )
        if tickets.exists():
            t = tickets.first()
            if t.status == 'serving':
                response = f"🎉 It's your turn! Your token is {t.token_display}. Please go to the counter now."
            else:
                response = (f"Your token is **{t.token_display}**. "
                            f"You are **#{t.position + 1}** in the queue. "
                            f"Estimated wait: **~{t.estimated_wait} minutes**.")
        else:
            response = "You don't have an active ticket. Would you like to join a queue?"

    # Intent: wait time
    elif any(k in msg for k in ['wait', 'how long', 'time', 'minutes']):
        intent = 'check_wait'
        tickets = QueueTicket.objects.filter(customer=user, status='waiting')
        if tickets.exists():
            t = tickets.first()
            response = (f"Your estimated wait time is approximately **{t.estimated_wait} minutes**. "
                        f"There are **{t.position}** people ahead of you.")
        else:
            response = "You don't have an active queue ticket right now."

    # Intent: join queue
    elif any(k in msg for k in ['join', 'register', 'get ticket', 'take ticket', 'queue up']):
        intent = 'join_queue'
        queues = Queue.objects.filter(status='open')
        if queues.exists():
            names = ', '.join([q.name for q in queues[:5]])
            response = f"Available queues: **{names}**. Visit the Queue page to join one."
        else:
            response = "No queues are currently open. Please check back later."

    # Intent: cancel
    elif any(k in msg for k in ['cancel', 'leave queue', 'remove me']):
        intent = 'cancel'
        response = "To cancel your ticket, go to My Tickets and click Cancel. Or I can help — just confirm."

    # Intent: greeting
    elif any(k in msg for k in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
        intent = 'greeting'
        response = f"Hello {user.get_full_name() or user.username}! 👋 I'm QueueBot. I can help you check your queue position, wait times, or find available queues."

    # Intent: help
    elif any(k in msg for k in ['help', 'what can you do', 'commands', 'options']):
        intent = 'help'
        response = ("Here's what I can help with:\n"
                    "• **My position** — check where you are in the queue\n"
                    "• **Wait time** — estimated time until you're served\n"
                    "• **Join queue** — find available queues\n"
                    "• **Cancel** — cancel your active ticket\n"
                    "• **Status** — overall queue status")

    # Intent: status
    elif any(k in msg for k in ['status', 'open', 'available queues', 'how many']):
        intent = 'status'
        queues = Queue.objects.filter(status='open')
        total_waiting = QueueTicket.objects.filter(status='waiting').count()
        response = (f"There are **{queues.count()} open queues** with "
                    f"**{total_waiting} customers** currently waiting.")

    return intent, response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot(request):
    message = request.data.get('message', '').strip()
    if not message:
        return Response({'error': 'Message is required.'}, status=400)

    # Save user message
    ChatMessage.objects.create(
        user=request.user, sender='user', message=message
    )

    # Get bot response
    intent, bot_reply = chatbot_response(request.user, message)

    # Save bot message
    bot_msg = ChatMessage.objects.create(
        user=request.user, sender='bot', message=bot_reply, intent=intent
    )

    return Response({
        'reply': bot_reply,
        'intent': intent,
        'message_id': str(bot_msg.id),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    messages = ChatMessage.objects.filter(user=request.user).order_by('created_at')[:50]
    return Response(ChatMessageSerializer(messages, many=True).data)


# ─── USER MANAGEMENT (Admin) ──────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)