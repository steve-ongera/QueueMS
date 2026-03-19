# QueueMS — Automated Digital Queue Management System

> **Kennedy Maina Kamau — SC211/0486/2022**  
> Bachelor of Science in Information Technology  
> Murang'a University of Technology

---

## Overview

QueueMS is a full-stack Automated Digital Queue Management System (ADQMS) integrated with a rule-based NLP chatbot. It addresses inefficiencies in traditional manual queuing systems used in hospitals, banks, government offices, and similar institutions.

### Key Features

- 🎫 **Digital Token System** — Auto-generated tokens (e.g. `A-042`)  
- 📊 **Real-time Dashboard** — Live stats: waiting, serving, completed today  
- 🤖 **AI Chatbot** — QueueBot answers queue position, wait time, and queue queries  
- 🔔 **Notifications** — In-app push notifications from the left/bottom  
- 🖥️ **Live Display Board** — Public display for service counters (dark theme)  
- 👥 **Role-based Access** — Admin, Staff, Customer  
- 🏪 **Service Counters** — Map staff to physical/virtual counters  
- 📱 **Responsive UI** — Works on mobile, tablet, desktop  
- 🔐 **Token Auth** — DRF Token authentication  

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Django 4.2 + Django REST Framework      |
| Frontend | React 18 + Vite + React Router v6       |
| Database | SQLite (dev) → PostgreSQL (production)  |
| Auth     | DRF Token Authentication                |
| Styling  | Custom CSS + Bootstrap Icons            |
| Chatbot  | Rule-based NLP (built-in, no API key)   |

---

## Project Structure

```
queuems/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── queuems/
│   │   ├── settings.py
│   │   ├── urls.py          ← points api/ → queue_app.urls
│   │   └── wsgi.py
│   └── queue_app/
│       ├── models.py        ← User, Queue, QueueTicket, ServiceCounter, Notification, ChatMessage
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py          ← all API endpoints
│       └── admin.py
│
└── frontend/
    ├── index.html           ← SEO meta + Bootstrap Icons CDN
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx          ← BrowserRouter + routes + layout
        ├── index.css        ← full design system (CSS variables, components)
        ├── context/
        │   ├── AuthContext.jsx
        │   └── ToastContext.jsx   ← left-side toast notifications
        ├── services/
        │   └── api.js            ← axios instance with token interceptor
        ├── components/
        │   ├── Sidebar.jsx        ← collapsible sidebar, role-aware nav
        │   ├── Navbar.jsx
        │   └── Chatbot.jsx        ← floating chatbot FAB + window
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx      ← stats + queue cards + join modal + token modal
            ├── Queues.jsx         ← CRUD queues + view tickets
            ├── MyTickets.jsx      ← customer's active & history tickets
            ├── ServeQueue.jsx     ← staff: call next, complete service
            ├── Counters.jsx       ← manage service counters
            ├── LiveDisplay.jsx    ← public board (dark, auto-refresh)
            ├── Notifications.jsx
            ├── Profile.jsx
            └── Users.jsx          ← admin user management
```

---

## API Endpoints

```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/logout/
GET    /api/auth/profile/
PATCH  /api/auth/profile/

GET    /api/dashboard/

GET    /api/queues/
POST   /api/queues/
GET    /api/queues/{id}/
PATCH  /api/queues/{id}/
DELETE /api/queues/{id}/
GET    /api/queues/{id}/tickets/
POST   /api/queues/{id}/call_next/
POST   /api/queues/{id}/toggle_status/

GET    /api/tickets/
GET    /api/tickets/my_tickets/
POST   /api/tickets/join/
POST   /api/tickets/{id}/cancel/
POST   /api/tickets/{id}/complete/

GET    /api/counters/
POST   /api/counters/
PATCH  /api/counters/{id}/
DELETE /api/counters/{id}/

GET    /api/notifications/
POST   /api/notifications/{id}/read/
POST   /api/notifications/mark-all-read/

POST   /api/chatbot/
GET    /api/chatbot/history/

GET    /api/users/
```

---

## Setup & Installation

### Backend

```bash
cd queuems/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (admin)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

> Django runs on **http://localhost:8000**  
> Admin panel: **http://localhost:8000/admin/**

### Frontend

```bash
cd queuems/frontend

# Install packages
npm install

# Copy env file
cp .env.example .env

# Start dev server
npm run dev
```

> React runs on **http://localhost:3000**

---

## Demo Accounts

After running `createsuperuser`, create test accounts via the admin panel or API:

| Role     | Username   | Password  |
|----------|------------|-----------|
| Admin    | admin      | admin123  |
| Staff    | staff1     | staff123  |
| Customer | customer1  | pass123   |

---

## Chatbot Intents (QueueBot)

The chatbot uses keyword-based NLP to detect these intents:

| Intent          | Trigger words                            |
|-----------------|------------------------------------------|
| `check_position`| position, number, where am i, turn       |
| `check_wait`    | wait, how long, time, minutes            |
| `join_queue`    | join, register, get ticket               |
| `cancel`        | cancel, leave queue                      |
| `greeting`      | hello, hi, hey, good morning             |
| `help`          | help, what can you do, commands          |
| `status`        | status, open, available queues           |

---

## Database Models

```
User         → extends AbstractUser (role, phone, avatar)
Queue        → name, prefix, status, max_capacity, avg_service_time
QueueTicket  → token_display, status, priority, position (computed)
ServiceCounter → name, service_type, is_active, staff (FK)
Notification → user, title, message, type, is_read
ChatMessage  → user, sender, message, intent
```

---

## Future Enhancements

- SMS notifications via Africa's Talking API  
- WebSocket real-time updates (Django Channels)  
- Advanced NLP with Dialogflow or Rasa  
- Appointment booking system  
- Analytics & reports with Chart.js  
- Multi-branch / multi-institution support  
- QR code ticket generation & scanning  

---

*QueueMS — Developed as a Final Year Project, Murang'a University of Technology, 2025*