from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Staff'),
        ('customer', 'Customer'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.CharField(max_length=10, blank=True)  # emoji avatar

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


class ServiceCounter(models.Model):
    """Physical or virtual service counters/windows"""
    name = models.CharField(max_length=100)  # e.g. "Counter 1", "Window A"
    service_type = models.CharField(max_length=100)  # e.g. "General", "Priority"
    is_active = models.BooleanField(default=True)
    staff = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_counters',
        limit_choices_to={'role': 'staff'}
    )

    def __str__(self):
        return f"{self.name} - {self.service_type}"


class Queue(models.Model):
    """A named queue for a service category"""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('paused', 'Paused'),
        ('closed', 'Closed'),
    ]
    name = models.CharField(max_length=100)  # e.g. "General Consultation"
    description = models.TextField(blank=True)
    prefix = models.CharField(max_length=5, default='A')  # Token prefix e.g. A, B, GP
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    max_capacity = models.PositiveIntegerField(default=100)
    avg_service_time = models.PositiveIntegerField(default=5)  # minutes per customer
    created_at = models.DateTimeField(auto_now_add=True)
    counters = models.ManyToManyField(ServiceCounter, blank=True, related_name='queues')

    def __str__(self):
        return self.name

    @property
    def waiting_count(self):
        return self.tickets.filter(status='waiting').count()

    @property
    def current_number(self):
        serving = self.tickets.filter(status='serving').first()
        return serving.token_number if serving else None


class QueueTicket(models.Model):
    """A customer's spot in the queue"""
    STATUS_CHOICES = [
        ('waiting', 'Waiting'),
        ('serving', 'Now Serving'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('priority', 'Priority'),  # elderly, disabled
        ('urgent', 'Urgent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    queue = models.ForeignKey(Queue, on_delete=models.CASCADE, related_name='tickets')
    customer = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='tickets'
    )
    customer_name = models.CharField(max_length=100, blank=True)  # for walk-ins
    customer_phone = models.CharField(max_length=20, blank=True)
    token_number = models.PositiveIntegerField()
    token_display = models.CharField(max_length=10)  # e.g. "A-042"
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='waiting')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    counter = models.ForeignKey(
        ServiceCounter, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='served_tickets'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    called_at = models.DateTimeField(null=True, blank=True)
    served_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['priority', 'token_number']

    def __str__(self):
        return f"{self.token_display} - {self.get_status_display()}"

    @property
    def position(self):
        """Position ahead in waiting queue"""
        if self.status != 'waiting':
            return 0
        return self.queue.tickets.filter(
            status='waiting',
            token_number__lt=self.token_number
        ).count()

    @property
    def estimated_wait(self):
        return self.position * self.queue.avg_service_time


class Notification(models.Model):
    """System notifications pushed to users"""
    TYPE_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=150)
    message = models.TextField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} -> {self.user.username}"


class ChatMessage(models.Model):
    """Chatbot conversation history"""
    SENDER_CHOICES = [
        ('user', 'User'),
        ('bot', 'Bot'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.CharField(max_length=5, choices=SENDER_CHOICES)
    message = models.TextField()
    intent = models.CharField(max_length=50, blank=True)  # detected intent
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']