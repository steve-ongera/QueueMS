from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Queue, QueueTicket, ServiceCounter, Notification, ChatMessage


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter = ['role', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Queue MS Fields', {'fields': ('role', 'phone', 'avatar')}),
    )


@admin.register(Queue)
class QueueAdmin(admin.ModelAdmin):
    list_display = ['name', 'prefix', 'status', 'waiting_count', 'avg_service_time']
    list_filter = ['status']
    search_fields = ['name']


@admin.register(QueueTicket)
class QueueTicketAdmin(admin.ModelAdmin):
    list_display = ['token_display', 'queue', 'customer_name', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'queue']
    search_fields = ['token_display', 'customer_name', 'customer_phone']
    readonly_fields = ['id', 'token_number', 'token_display', 'created_at']


@admin.register(ServiceCounter)
class ServiceCounterAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'is_active', 'staff']
    list_filter = ['is_active']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'type', 'is_read', 'created_at']
    list_filter = ['type', 'is_read']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['user', 'sender', 'intent', 'created_at']
    list_filter = ['sender', 'intent']