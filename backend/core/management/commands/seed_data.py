"""
Management command to seed QueueMS with realistic Kenyan data.

Usage:
    python manage.py seed_data               # seed everything (default)
    python manage.py seed_data --flush       # wipe all data first, then seed
    python manage.py seed_data --users       # seed users only
    python manage.py seed_data --queues      # seed queues + counters only
    python manage.py seed_data --tickets     # seed tickets only (requires users + queues)
    python manage.py seed_data --flush --all # full fresh reset
"""

import random
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import (
    ChatMessage,
    Notification,
    Queue,
    QueueTicket,
    ServiceCounter,
    User,
)


# ─── Kenyan Data ─────────────────────────────────────────────────────────────

KE_FIRST_NAMES_MALE = [
    "Kamau", "Njoroge", "Mwangi", "Kiprotich", "Otieno", "Ochieng", "Waweru",
    "Mutua", "Kariuki", "Kimani", "Kipchoge", "Omondi", "Adhiambo", "Simiyu",
    "Baraza", "Cheruiyot", "Rotich", "Kiplangat", "Njuguna", "Muthee",
    "Githinji", "Macharia", "Njogu", "Wanjiku", "Mugo", "Karanja", "Gacheru",
    "Thuku", "Waititu", "Ndungu",
]

KE_FIRST_NAMES_FEMALE = [
    "Wanjiru", "Akinyi", "Nafula", "Chebet", "Adhiambo", "Wambui", "Njeri",
    "Auma", "Zawadi", "Wanjiku", "Mumbi", "Atieno", "Wangari", "Kerubo",
    "Nekesa", "Awino", "Nashipai", "Chepkoech", "Jebet", "Wanja",
    "Nyambura", "Muthoni", "Wairimu", "Gathoni", "Nyawira", "Wangeci",
    "Moraa", "Kwamboka", "Kemunto", "Bosibori",
]

KE_LAST_NAMES = [
    "Kamau", "Odhiambo", "Mutua", "Kibet", "Onyango", "Mwangi", "Njoroge",
    "Waweru", "Kariuki", "Kimani", "Rotich", "Cheruiyot", "Auma", "Simiyu",
    "Barasa", "Koech", "Kigen", "Ngetich", "Ruto", "Langat",
    "Macharia", "Githinji", "Muriuki", "Njogu", "Thuku", "Karanja",
    "Ndungu", "Gacheru", "Waititu", "Njuguna",
]

KE_PHONE_PREFIXES = ["0700", "0701", "0710", "0711", "0712", "0720",
                      "0721", "0722", "0723", "0724", "0725", "0726",
                      "0729", "0740", "0741", "0742", "0745", "0757",
                      "0768", "0769", "0790", "0791", "0792", "0110",
                      "0111", "0113", "0114", "0115"]

KE_COUNTIES = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika",
    "Murang'a", "Nyeri", "Meru", "Embu", "Machakos", "Kitale",
    "Garissa", "Kakamega", "Kisii", "Kericho",
]

# Institutions / departments common in Kenya
HOSPITAL_QUEUES = [
    {
        "name": "Outpatient Department (OPD)",
        "description": "General outpatient consultation and triage",
        "prefix": "OPD",
        "avg_service_time": 15,
    },
    {
        "name": "Pharmacy",
        "description": "Prescription collection and medication dispensing",
        "prefix": "PH",
        "avg_service_time": 8,
    },
    {
        "name": "Laboratory Services",
        "description": "Blood tests, urinalysis, and diagnostic samples",
        "prefix": "LAB",
        "avg_service_time": 10,
    },
    {
        "name": "Maternal & Child Health (MCH)",
        "description": "Antenatal care, immunisation, and child welfare clinics",
        "prefix": "MCH",
        "avg_service_time": 20,
    },
    { 
        "name": "Radiology & Imaging",
        "description": "X-ray, ultrasound, and CT scan bookings",
        "prefix": "RAD",
        "avg_service_time": 25,
    },
    {
        "name": "Dental Clinic",
        "description": "Dental consultation and treatment",
        "prefix": "DEN",
        "avg_service_time": 30,
    },
    {
        "name": "Eye Clinic",
        "description": "Optometry and ophthalmology consultations",
        "prefix": "EYE",
        "avg_service_time": 20,
    },
    {
        "name": "Accounts & Billing",
        "description": "Payment, NHIF claims, and insurance billing",
        "prefix": "ACC",
        "avg_service_time": 7,
    },
]

COUNTER_NAMES = [
    "Counter 1", "Counter 2", "Counter 3", "Counter 4",
    "Window A", "Window B", "Window C",
    "Desk 1", "Desk 2",
    "Teller 1", "Teller 2", "Teller 3",
    "Bay 1", "Bay 2",
]

COUNTER_SERVICE_TYPES = [
    "General Services",
    "Priority Services",
    "Express Services",
    "VIP Services",
    "Disability-Friendly",
    "Senior Citizens",
]

STAFF_NOTES = [
    "Fluent in Swahili and English",
    "Trained in patient-centred care",
    "Available Mon–Fri",
    "Handles priority cases",
    "Certified healthcare assistant",
]

CHAT_CONVERSATIONS = [
    ("hello", "Hi! I'm QueueBot. How can I help you today?"),
    ("my position", "You are currently #3 in the queue. Estimated wait: ~15 minutes."),
    ("how long will i wait", "Based on current traffic, your estimated wait is approximately 10 minutes."),
    ("available queues", "The following queues are open: OPD, Pharmacy, Laboratory. Visit the Queue page to join."),
    ("help", "I can help with: queue position, wait times, available queues, and cancellations."),
]

NOTIFICATION_TEMPLATES = [
    ("Joined Queue", "Your token is {token}. You are #{pos} in the queue. Estimated wait: ~{wait} minutes.", "info"),
    ("Your Turn!", "Token {token} — please proceed to {counter} now.", "success"),
    ("Queue Update", "3 people ahead of you. Estimated wait: ~{wait} minutes.", "info"),
    ("Queue Paused", "The {queue} queue has been temporarily paused. Please wait.", "warning"),
    ("Service Complete", "Thank you for visiting. Your service at {queue} is complete.", "success"),
    ("Queue Reopened", "The {queue} queue is now open again. Please rejoin.", "info"),
]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def rnd_phone():
    prefix = random.choice(KE_PHONE_PREFIXES)
    suffix = "".join([str(random.randint(0, 9)) for _ in range(6)])
    return f"{prefix}{suffix}"


def rnd_name(gender=None):
    if gender == "M":
        first = random.choice(KE_FIRST_NAMES_MALE)
    elif gender == "F":
        first = random.choice(KE_FIRST_NAMES_FEMALE)
    else:
        first = random.choice(KE_FIRST_NAMES_MALE + KE_FIRST_NAMES_FEMALE)
    last = random.choice(KE_LAST_NAMES)
    return first, last


def rnd_email(first, last):
    domains = ["gmail.com", "yahoo.com", "outlook.com", "ke.gmail.com",
               "safaricom.co.ke", "kenyapower.co.ke"]
    num = random.randint(1, 999)
    return f"{first.lower()}.{last.lower()}{num}@{random.choice(domains)}"


def progress(label, current, total, width=30):
    filled = int(width * current / total)
    bar = "█" * filled + "░" * (width - filled)
    pct = int(100 * current / total)
    print(f"\r  {label}: [{bar}] {pct}% ({current}/{total})", end="", flush=True)
    if current == total:
        print()


# ─── Command ─────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed QueueMS database with realistic Kenyan hospital data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing data before seeding.",
        )
        parser.add_argument(
            "--users",
            action="store_true",
            help="Seed users only.",
        )
        parser.add_argument(
            "--queues",
            action="store_true",
            help="Seed queues and counters only.",
        )
        parser.add_argument(
            "--tickets",
            action="store_true",
            help="Seed tickets only (requires users and queues to exist).",
        )
        parser.add_argument(
            "--notifications",
            action="store_true",
            help="Seed notifications only.",
        )
        parser.add_argument(
            "--chat",
            action="store_true",
            help="Seed chatbot conversation history only.",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            default=True,
            help="Seed everything (default behaviour).",
        )
        # Volume controls
        parser.add_argument("--admins", type=int, default=2, help="Number of admin users (default: 2)")
        parser.add_argument("--staff", type=int, default=8, help="Number of staff users (default: 8)")
        parser.add_argument("--customers", type=int, default=40, help="Number of customers (default: 40)")
        parser.add_argument("--tickets-per-queue", type=int, default=15,
                            help="Tickets per queue (default: 15)")

    # ── Main entry ────────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        self.stdout.write("\n" + "═" * 58)
        self.stdout.write(self.style.SUCCESS("  QueueMS — Kenyan Seed Data"))
        self.stdout.write("  Murang'a University of Technology")
        self.stdout.write("═" * 58 + "\n")

        seed_all = options["all"]
        do_users = options["users"] or seed_all
        do_queues = options["queues"] or seed_all
        do_tickets = options["tickets"] or seed_all
        do_notifs = options["notifications"] or seed_all
        do_chat = options["chat"] or seed_all

        # If any specific flag is set (not just --all), turn off global seed
        specific = any([options["users"], options["queues"],
                        options["tickets"], options["notifications"], options["chat"]])
        if specific:
            do_users = options["users"]
            do_queues = options["queues"]
            do_tickets = options["tickets"]
            do_notifs = options["notifications"]
            do_chat = options["chat"]

        if options["flush"]:
            self._flush()

        if do_users:
            admin_users = self._seed_admins(options["admins"])
            staff_users = self._seed_staff(options["staff"])
            customer_users = self._seed_customers(options["customers"])
        else:
            admin_users = list(User.objects.filter(role="admin"))
            staff_users = list(User.objects.filter(role="staff"))
            customer_users = list(User.objects.filter(role="customer"))

        if do_queues:
            queues, counters = self._seed_queues_and_counters(staff_users)
        else:
            queues = list(Queue.objects.all())
            counters = list(ServiceCounter.objects.all())

        if do_tickets and queues and customer_users:
            tickets = self._seed_tickets(queues, counters, customer_users, options["tickets_per_queue"])
        else:
            tickets = list(QueueTicket.objects.all())

        if do_notifs and customer_users:
            self._seed_notifications(customer_users, tickets, queues)

        if do_chat and customer_users:
            self._seed_chat(customer_users)

        self._print_summary(admin_users, staff_users, customer_users, queues, counters, tickets)

    # ── Flush ─────────────────────────────────────────────────────────────────

    def _flush(self):
        self.stdout.write(self.style.WARNING("\n  ⚠  Flushing existing data…"))
        ChatMessage.objects.all().delete()
        Notification.objects.all().delete()
        QueueTicket.objects.all().delete()
        Queue.objects.all().delete()
        ServiceCounter.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS("  ✓  All data cleared.\n"))

    # ── Admins ────────────────────────────────────────────────────────────────

    def _seed_admins(self, count):
        self.stdout.write("\n  👤  Seeding admin users…")
        created = []

        # Hardcoded primary admin
        admin, made = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@queuems.hospital.co.ke",
                "first_name": "Wanjiku",
                "last_name": "Kamau",
                "role": "admin",
                "phone": "0722000001",
                "password": make_password("admin123"),
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if made:
            created.append(admin)
            self.stdout.write(f"    + admin / admin123  ({admin.first_name} {admin.last_name})")

        for i in range(1, count):
            first, last = rnd_name()
            username = f"admin{i}"
            user, made = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": rnd_email(first, last),
                    "first_name": first,
                    "last_name": last,
                    "role": "admin",
                    "phone": rnd_phone(),
                    "password": make_password("admin123"),
                    "is_staff": True,
                    "is_superuser": False,
                },
            )
            if made:
                created.append(user)
                self.stdout.write(f"    + {username} / admin123  ({first} {last})")

        self.stdout.write(self.style.SUCCESS(f"  ✓  {len(created)} admin(s) created."))
        return list(User.objects.filter(role="admin"))

    # ── Staff ─────────────────────────────────────────────────────────────────

    def _seed_staff(self, count):
        self.stdout.write("\n  👔  Seeding staff users…")
        created = []
        departments = [
            "OPD", "Pharmacy", "Laboratory", "MCH", "Radiology",
            "Dental", "Eye Clinic", "Accounts",
        ]

        for i in range(1, count + 1):
            first, last = rnd_name()
            username = f"staff{i}"
            dept = departments[(i - 1) % len(departments)]
            user, made = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": rnd_email(first, last),
                    "first_name": first,
                    "last_name": last,
                    "role": "staff",
                    "phone": rnd_phone(),
                    "password": make_password("staff123"),
                    "is_staff": False,
                },
            )
            if made:
                created.append(user)
                progress("  Staff", i, count)

        print()
        self.stdout.write(self.style.SUCCESS(f"  ✓  {len(created)} staff user(s) created."))
        self.stdout.write("    All staff login: staffN / staff123  (N = 1…{})".format(count))
        return list(User.objects.filter(role="staff"))

    # ── Customers ─────────────────────────────────────────────────────────────

    def _seed_customers(self, count):
        self.stdout.write("\n  🧑  Seeding customer users…")
        created = []

        # Kenyan-flavoured patient names
        for i in range(1, count + 1):
            gender = random.choice(["M", "F"])
            first, last = rnd_name(gender)
            username = f"customer{i}"
            county = random.choice(KE_COUNTIES)
            user, made = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": rnd_email(first, last),
                    "first_name": first,
                    "last_name": last,
                    "role": "customer",
                    "phone": rnd_phone(),
                    "password": make_password("pass123"),
                },
            )
            if made:
                created.append(user)
            progress("  Customers", i, count)

        print()
        self.stdout.write(self.style.SUCCESS(f"  ✓  {len(created)} customer(s) created."))
        self.stdout.write("    All customers login: customerN / pass123  (N = 1…{})".format(count))
        return list(User.objects.filter(role="customer"))

    # ── Queues & Counters ─────────────────────────────────────────────────────

    def _seed_queues_and_counters(self, staff_users):
        self.stdout.write("\n  🏥  Seeding hospital queues…")
        queues = []

        for i, q_data in enumerate(HOSPITAL_QUEUES):
            status = "open"
            if q_data["name"] == "Dental Clinic":
                status = "paused"   # realistically often paused
            if q_data["name"] == "Radiology & Imaging":
                status = "open"

            queue, made = Queue.objects.get_or_create(
                name=q_data["name"],
                defaults={
                    "description": q_data["description"],
                    "prefix": q_data["prefix"],
                    "status": status,
                    "max_capacity": random.randint(80, 150),
                    "avg_service_time": q_data["avg_service_time"],
                },
            )
            queues.append(queue)
            status_icon = "🟢" if status == "open" else "🟡"
            self.stdout.write(
                f"    {status_icon} [{queue.prefix}] {queue.name} "
                f"(~{queue.avg_service_time}m per patient)"
            )

        self.stdout.write(self.style.SUCCESS(f"\n  ✓  {len(queues)} queues ready."))

        # ── Service counters ──
        self.stdout.write("\n  🪟  Seeding service counters…")
        counters = []
        staff_pool = list(staff_users)
        random.shuffle(staff_pool)
        staff_idx = 0

        counter_configs = [
            ("Counter 1",  "General Services",       True),
            ("Counter 2",  "General Services",       True),
            ("Counter 3",  "Priority Services",      True),
            ("Counter 4",  "Express Services",       True),
            ("Window A",   "Senior Citizens",        True),
            ("Window B",   "Disability-Friendly",    True),
            ("Window C",   "General Services",       True),
            ("Teller 1",   "Accounts & Billing",     True),
            ("Teller 2",   "Accounts & Billing",     True),
            ("Pharmacy Bay 1", "Prescription",       True),
            ("Pharmacy Bay 2", "OTC Medicines",      True),
            ("Lab Reception",  "Sample Collection",  True),
            ("Radiology Desk", "Imaging Bookings",   False),
            ("MCH Desk",       "Maternal Health",    True),
            ("Dental Chair",   "Dental Services",    False),
        ]

        for name, service_type, is_active in counter_configs:
            assigned_staff = None
            if staff_pool and staff_idx < len(staff_pool):
                assigned_staff = staff_pool[staff_idx]
                staff_idx += 1

            counter, made = ServiceCounter.objects.get_or_create(
                name=name,
                defaults={
                    "service_type": service_type,
                    "is_active": is_active,
                    "staff": assigned_staff,
                },
            )
            counters.append(counter)
            active_str = "✅" if is_active else "⛔"
            staff_str = f"→ {assigned_staff.get_full_name()}" if assigned_staff else "→ unassigned"
            self.stdout.write(f"    {active_str} {name} [{service_type}] {staff_str}")

        # Assign relevant counters to queues
        counter_map = {c.name: c for c in counters}
        queue_counter_map = {
            "Outpatient Department (OPD)":   ["Counter 1", "Counter 2", "Counter 3"],
            "Pharmacy":                       ["Pharmacy Bay 1", "Pharmacy Bay 2"],
            "Laboratory Services":            ["Lab Reception"],
            "Maternal & Child Health (MCH)":  ["MCH Desk", "Window A"],
            "Radiology & Imaging":            ["Radiology Desk"],
            "Dental Clinic":                  ["Dental Chair"],
            "Eye Clinic":                     ["Counter 4"],
            "Accounts & Billing":             ["Teller 1", "Teller 2"],
        }
        for queue in queues:
            names = queue_counter_map.get(queue.name, [])
            for cname in names:
                if cname in counter_map:
                    queue.counters.add(counter_map[cname])

        self.stdout.write(self.style.SUCCESS(f"\n  ✓  {len(counters)} counters created and assigned."))
        return queues, counters

    # ── Tickets ───────────────────────────────────────────────────────────────

    def _seed_tickets(self, queues, counters, customers, tickets_per_queue):
        self.stdout.write("\n  🎫  Seeding queue tickets…")
        all_tickets = []
        now = timezone.now()
        today_start = now.replace(hour=7, minute=30, second=0, microsecond=0)

        STATUS_WEIGHTS = {
            "waiting": 0.35,
            "serving": 0.05,   # only 1 per queue at most
            "completed": 0.45,
            "cancelled": 0.10,
            "skipped": 0.05,
        }

        PRIORITY_WEIGHTS = {
            "normal": 0.75,
            "priority": 0.18,
            "urgent": 0.07,
        }

        total = len(queues) * tickets_per_queue
        done = 0

        for queue in queues:
            token_num = 1
            serving_assigned = False

            # Scatter arrival times throughout the working day (7:30am – now)
            time_slots = sorted([
                today_start + timedelta(minutes=random.randint(0, int((now - today_start).total_seconds() / 60)))
                for _ in range(tickets_per_queue)
            ])

            for i, arrived_at in enumerate(time_slots):
                customer = random.choice(customers)
                priority = random.choices(
                    list(PRIORITY_WEIGHTS.keys()),
                    weights=list(PRIORITY_WEIGHTS.values()),
                )[0]
                token_display = f"{queue.prefix}-{str(token_num).zfill(3)}"

                # Determine status
                if not serving_assigned and queue.status == "open":
                    status = "serving"
                    serving_assigned = True
                else:
                    status = random.choices(
                        ["waiting", "completed", "cancelled", "skipped"],
                        weights=[0.35, 0.48, 0.12, 0.05],
                    )[0]

                # Build timestamps
                called_at = None
                served_at = None
                completed_at = None

                if status == "serving":
                    called_at = now - timedelta(minutes=random.randint(1, 5))
                    served_at = called_at + timedelta(seconds=random.randint(30, 120))
                elif status == "completed":
                    called_at = arrived_at + timedelta(minutes=random.randint(5, queue.avg_service_time * 3))
                    served_at = called_at + timedelta(seconds=random.randint(30, 90))
                    service_duration = timedelta(minutes=random.randint(
                        max(1, queue.avg_service_time - 5),
                        queue.avg_service_time + 10
                    ))
                    completed_at = served_at + service_duration
                elif status == "skipped":
                    called_at = arrived_at + timedelta(minutes=random.randint(10, 30))

                # Pick a counter from the queue's assigned counters
                q_counters = list(queue.counters.all())
                assigned_counter = random.choice(q_counters) if q_counters else None

                ticket = QueueTicket(
                    queue=queue,
                    customer=customer,
                    customer_name=f"{customer.first_name} {customer.last_name}",
                    customer_phone=customer.phone,
                    token_number=token_num,
                    token_display=token_display,
                    status=status,
                    priority=priority,
                    counter=assigned_counter if status in ["serving", "completed"] else None,
                    notes=random.choice([
                        "", "", "",
                        "Referred by Dr. Kariuki",
                        "Follow-up visit",
                        "New patient",
                        "Repeat prescription",
                        "Emergency referral",
                        "Insurance patient — NHIF",
                        "Cash payment",
                        "Corporate client",
                    ]),
                    created_at=arrived_at,
                    called_at=called_at,
                    served_at=served_at,
                    completed_at=completed_at,
                )
                ticket.save()
                all_tickets.append(ticket)
                token_num += 1
                done += 1
                progress("  Tickets", done, total)

        print()
        self.stdout.write(self.style.SUCCESS(f"  ✓  {len(all_tickets)} tickets created."))

        # Breakdown
        for s in ["waiting", "serving", "completed", "cancelled", "skipped"]:
            count = sum(1 for t in all_tickets if t.status == s)
            icon = {"waiting": "⏳", "serving": "🔔", "completed": "✅",
                    "cancelled": "❌", "skipped": "⏭"}[s]
            self.stdout.write(f"    {icon}  {s.capitalize()}: {count}")

        return all_tickets

    # ── Notifications ─────────────────────────────────────────────────────────

    def _seed_notifications(self, customers, tickets, queues):
        self.stdout.write("\n  🔔  Seeding notifications…")
        created = 0
        now = timezone.now()

        sample_customers = random.sample(customers, min(20, len(customers)))

        for customer in sample_customers:
            customer_tickets = [t for t in tickets if t.customer_id == customer.id]
            if not customer_tickets:
                continue

            # Notification 1: joined queue
            ticket = random.choice(customer_tickets)
            Notification.objects.get_or_create(
                user=customer,
                title="Joined Queue",
                defaults={
                    "message": (
                        f"Your token is {ticket.token_display}. You are "
                        f"#{ticket.position + 1} in the {ticket.queue.name} queue. "
                        f"Estimated wait: ~{ticket.estimated_wait} minutes."
                    ),
                    "type": "info",
                    "is_read": random.choice([True, True, False]),
                    "created_at": ticket.created_at,
                },
            )
            created += 1

            # Notification 2: your turn (if any completed/serving)
            served = [t for t in customer_tickets if t.status in ["serving", "completed"]]
            if served:
                t = random.choice(served)
                counter_name = t.counter.name if t.counter else "the service counter"
                Notification.objects.get_or_create(
                    user=customer,
                    title="Your Turn!",
                    defaults={
                        "message": (
                            f"Token {t.token_display} — please proceed to "
                            f"{counter_name} now. Do not delay or your slot may be skipped."
                        ),
                        "type": "success",
                        "is_read": random.choice([True, False]),
                        "created_at": t.called_at or now,
                    },
                )
                created += 1

            # Notification 3: queue status update (random)
            if random.random() > 0.6:
                queue = random.choice(queues)
                Notification.objects.create(
                    user=customer,
                    title="Queue Update" if queue.status == "open" else "Queue Paused",
                    message=(
                        f"The {queue.name} queue currently has "
                        f"{queue.waiting_count} patient(s) waiting. "
                        "Average service time is "
                        f"~{queue.avg_service_time} minutes per patient."
                        if queue.status == "open"
                        else f"The {queue.name} queue has been temporarily paused. "
                             "Please check back shortly or visit the reception desk."
                    ),
                    type="info" if queue.status == "open" else "warning",
                    is_read=False,
                    created_at=now - timedelta(minutes=random.randint(5, 120)),
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓  {created} notifications created."))

    # ── Chat History ──────────────────────────────────────────────────────────

    def _seed_chat(self, customers):
        self.stdout.write("\n  💬  Seeding chatbot history…")
        created = 0
        now = timezone.now()

        sample = random.sample(customers, min(15, len(customers)))

        full_conversations = [
            [
                ("habari", "bot", "Habari! Mimi ni QueueBot 🤖 Naweza kukusaidia kuangalia nafasi yako gereani au muda wa kusubiri."),
                ("my position", "user", "my position"),
                ("You are #4 in the Pharmacy queue. Est. wait: ~32 minutes.", "bot", "check_position"),
                ("how long", "user", "how long"),
                ("Based on current queue flow, approximately 32 minutes.", "bot", "check_wait"),
            ],
            [
                ("hello", "user", "hello"),
                ("Hello! I'm QueueBot. Ask me about your queue position, wait times, or available services.", "bot", "greeting"),
                ("available queues", "user", "available queues"),
                ("Open queues: OPD, Pharmacy, Lab, MCH, Eye Clinic. Visit the Queues page to join one.", "bot", "status"),
                ("join queue", "user", "join queue"),
                ("Head over to the Queues page and click 'Join Queue' on any open service.", "bot", "join_queue"),
            ],
            [
                ("my turn?", "user", "my turn?"),
                ("Let me check… You are #2 in the OPD queue. Almost your turn!", "bot", "check_position"),
                ("ok thanks", "user", "ok thanks"),
                ("You're welcome! I'll notify you when it's your turn. 😊", "bot", "greeting"),
            ],
            [
                ("cancel my ticket", "user", "cancel my ticket"),
                ("To cancel, go to My Tickets and click Cancel on your active ticket.", "bot", "cancel"),
                ("done", "user", "done"),
                ("Great! If you need to rejoin, just visit the Queues page anytime.", "bot", "help"),
            ],
            [
                ("how many people waiting at lab", "user", "how many people waiting at lab"),
                ("The Laboratory queue currently has several patients waiting. Average service time is ~10 minutes.", "bot", "status"),
                ("ok", "user", "ok"),
            ],
        ]

        for customer in sample:
            convo = random.choice(full_conversations)
            base_time = now - timedelta(hours=random.randint(1, 6))

            for j, (msg, sender, intent_or_type) in enumerate(convo):
                msg_time = base_time + timedelta(seconds=j * random.randint(15, 90))
                if sender == "user":
                    ChatMessage.objects.create(
                        user=customer,
                        sender="user",
                        message=msg,
                        intent="",
                        created_at=msg_time,
                    )
                else:
                    ChatMessage.objects.create(
                        user=customer,
                        sender="bot",
                        message=msg,
                        intent=intent_or_type,
                        created_at=msg_time + timedelta(seconds=2),
                    )
                created += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓  {created} chat messages created."))

    # ── Summary ───────────────────────────────────────────────────────────────

    def _print_summary(self, admins, staff, customers, queues, counters, tickets):
        total_users = len(admins) + len(staff) + len(customers)
        waiting = sum(1 for t in tickets if t.status == "waiting")
        serving = sum(1 for t in tickets if t.status == "serving")
        completed = sum(1 for t in tickets if t.status == "completed")
        cancelled = sum(1 for t in tickets if t.status == "cancelled")
        notifs = Notification.objects.count()
        chats = ChatMessage.objects.count()

        self.stdout.write("\n" + "═" * 58)
        self.stdout.write(self.style.SUCCESS("  ✅  Seed Complete — Summary"))
        self.stdout.write("═" * 58)
        self.stdout.write(f"  👥  Users:          {total_users}")
        self.stdout.write(f"       Admin(s):      {len(admins)}")
        self.stdout.write(f"       Staff:         {len(staff)}")
        self.stdout.write(f"       Customers:     {len(customers)}")
        self.stdout.write(f"  🏥  Queues:         {len(queues)}")
        self.stdout.write(f"  🪟  Counters:       {len(counters)}")
        self.stdout.write(f"  🎫  Tickets:        {len(tickets)}")
        self.stdout.write(f"       ⏳ Waiting:    {waiting}")
        self.stdout.write(f"       🔔 Serving:    {serving}")
        self.stdout.write(f"       ✅ Completed:  {completed}")
        self.stdout.write(f"       ❌ Cancelled:  {cancelled}")
        self.stdout.write(f"  🔔  Notifications:  {notifs}")
        self.stdout.write(f"  💬  Chat messages:  {chats}")
        self.stdout.write("═" * 58)
        self.stdout.write("\n  🔑  Login credentials:")
        self.stdout.write("      Admin:    admin / admin123")
        self.stdout.write("      Staff:    staff1 … staff{} / staff123".format(len(staff)))
        self.stdout.write("      Customer: customer1 … customer{} / pass123".format(len(customers)))
        self.stdout.write("\n  🌐  Start the server:")
        self.stdout.write("      python manage.py runserver")
        self.stdout.write("      http://localhost:8000/api/\n")