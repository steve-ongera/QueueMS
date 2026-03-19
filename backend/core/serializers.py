from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Queue, QueueTicket, ServiceCounter, Notification, ChatMessage


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'role', 'phone', 'avatar']
        read_only_fields = ['id']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name',
                  'password', 'password2', 'phone', 'role']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data


class ServiceCounterSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCounter
        fields = ['id', 'name', 'service_type', 'is_active', 'staff', 'staff_name']

    def get_staff_name(self, obj):
        return obj.staff.get_full_name() if obj.staff else None


class QueueSerializer(serializers.ModelSerializer):
    waiting_count = serializers.ReadOnlyField()
    current_number = serializers.ReadOnlyField()
    counters = ServiceCounterSerializer(many=True, read_only=True)

    class Meta:
        model = Queue
        fields = ['id', 'name', 'description', 'prefix', 'status',
                  'max_capacity', 'avg_service_time', 'waiting_count',
                  'current_number', 'counters', 'created_at']
        read_only_fields = ['id', 'created_at']


class QueueTicketSerializer(serializers.ModelSerializer):
    position = serializers.ReadOnlyField()
    estimated_wait = serializers.ReadOnlyField()
    queue_name = serializers.SerializerMethodField()
    counter_name = serializers.SerializerMethodField()

    class Meta:
        model = QueueTicket
        fields = [
            'id', 'queue', 'queue_name', 'customer', 'customer_name',
            'customer_phone', 'token_number', 'token_display', 'status',
            'priority', 'counter', 'counter_name', 'notes', 'position',
            'estimated_wait', 'created_at', 'called_at', 'served_at', 'completed_at'
        ]
        read_only_fields = ['id', 'token_number', 'token_display', 'created_at',
                            'called_at', 'served_at', 'completed_at']

    def get_queue_name(self, obj):
        return obj.queue.name

    def get_counter_name(self, obj):
        return obj.counter.name if obj.counter else None


class JoinQueueSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    customer_name = serializers.CharField(max_length=100, required=False)
    customer_phone = serializers.CharField(max_length=20, required=False)
    priority = serializers.ChoiceField(
        choices=['normal', 'priority', 'urgent'],
        default='normal'
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'type', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'message', 'intent', 'created_at']
        read_only_fields = ['id', 'sender', 'intent', 'created_at']


class DashboardStatsSerializer(serializers.Serializer):
    total_queues = serializers.IntegerField()
    total_waiting = serializers.IntegerField()
    total_serving = serializers.IntegerField()
    total_completed_today = serializers.IntegerField()
    active_counters = serializers.IntegerField()
    avg_wait_time = serializers.FloatField()
    queues = QueueSerializer(many=True)