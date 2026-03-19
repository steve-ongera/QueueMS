from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'queues', views.QueueViewSet, basename='queue')
router.register(r'tickets', views.QueueTicketViewSet, basename='ticket')
router.register(r'counters', views.ServiceCounterViewSet, basename='counter')
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # Auth
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/profile/', views.profile, name='profile'),

    # Dashboard
    path('dashboard/', views.dashboard_stats, name='dashboard'),

    # Notifications
    path('notifications/', views.notifications, name='notifications'),
    path('notifications/<int:pk>/read/', views.mark_notification_read, name='mark-read'),
    path('notifications/mark-all-read/', views.mark_all_read, name='mark-all-read'),

    # Chatbot
    path('chatbot/', views.chatbot, name='chatbot'),
    path('chatbot/history/', views.chat_history, name='chat-history'),

    # Router
    path('', include(router.urls)),
]