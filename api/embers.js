const { fetchGist, updateGistFile } = require('./_gist');

const DEFAULT_SCHEDULE = [
  // DAY 1: NOV 24, 2026
  { id: "S1", day: 1, date: "2026-11-24", start: "08:30", end: "09:30", title: "Reporting & ID Verification", venue: "Foyer Help Desk", track: "ALL", desc: "Physical College ID verification, kit distribution & badge collection", status: "SCHEDULED" },
  { id: "S2", day: 1, date: "2026-11-24", start: "09:30", end: "10:15", title: "Inaugural Ceremony & Keynote", venue: "Auditorium", track: "ALL", desc: "Welcome address by HoD CSE, lighting of the lamp & IEEE keynote", status: "SCHEDULED" },
  { id: "S3", day: 1, date: "2026-11-24", start: "10:30", end: "13:00", title: "Track 1: Embeddathon — Hackathon Kickoff", venue: "Computer Labs 1 & 2", track: "TRACK_1", desc: "Problem statement reveal, hardware staging, and Phase 1 prototype development", status: "SCHEDULED" },
  { id: "S4", day: 1, date: "2026-11-24", start: "13:00", end: "14:00", title: "Networking Lunch & Prayer Break", venue: "Dining Hall", track: "ALL", desc: "Buffet lunch served for all registered participants and jury", status: "SCHEDULED" },
  { id: "S5", day: 1, date: "2026-11-24", start: "14:00", end: "16:30", title: "Phase 1: Mentoring & Evaluation Rounds", venue: "Labs & Stalls", track: "TRACK_1", desc: "Internal CSE Faculty Mentors evaluate progress (30% weightage)", status: "SCHEDULED" },
  { id: "S6", day: 1, date: "2026-11-24", start: "16:30", end: "17:00", title: "Day 1 Wrap-up & Hardware Lock-in", venue: "Edusat Hall", track: "TRACK_1", desc: "Overnight prototype testing briefing & Day 2 preparations", status: "SCHEDULED" },

  // DAY 2: NOV 25, 2026
  { id: "S7", day: 2, date: "2026-11-25", start: "08:45", end: "09:30", title: "Day 2 Participant Reporting & Setup", venue: "Edusat & Multipurpose Hall", track: "ALL", desc: "Prototype setup at designated stalls & slide decks uploaded", status: "SCHEDULED" },
  { id: "S8", day: 2, date: "2026-11-25", start: "09:30", end: "12:45", title: "Track 2: Project Exhibition / Expo (Live)", venue: "Edusat Hall", track: "TRACK_2", desc: "Working hardware prototypes & live software demonstrations before External Jury (70%)", status: "SCHEDULED" },
  { id: "S9", day: 2, date: "2026-11-25", start: "09:30", end: "12:45", title: "Track 3: Technical Paper Competition", venue: "Multipurpose Hall", track: "TRACK_3", desc: "IEEE 2-column paper presentations & defense before academic evaluator panel", status: "SCHEDULED" },
  { id: "S10", day: 2, date: "2026-11-25", start: "12:45", end: "13:45", title: "Symposium Lunch & Refreshments", venue: "Dining Hall", track: "ALL", desc: "Lunch break for delegates, participants, faculty & judges", status: "SCHEDULED" },
  { id: "S11", day: 2, date: "2026-11-25", start: "14:00", end: "15:15", title: "Jury Consolidation & Result Finalization", venue: "Coordinator Control Room", track: "ALL", desc: "Internal (30%) + External (70%) scores aggregated into final merit ledger", status: "SCHEDULED" },
  { id: "S12", day: 2, date: "2026-11-25", start: "15:30", end: "16:45", title: "Grand Valedictory Ceremony & Results Reveal", venue: "Main Auditorium", track: "ALL", desc: "Live Projector Reveal Ceremony, Olympic Podium, Trophy & Certificate Handover", status: "SCHEDULED" }
];

const OFFICIAL_REGISTRATIONS = [
  {
    "id": "EMBERS-001",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "SecureX - SMS Based Device Monitoring and Control System",
    "leaderName": "DARSHAN MANJUNATH MOGER",
    "lead_name": "DARSHAN MANJUNATH MOGER",
    "email": "cmveeresh7453@gmail.com",
    "phone": "+91 9483509588",
    "usn": "4SH23CS030",
    "college": "SHREE DEVI INSTITUTE OF TECHNOLOGY",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "DARSHAN MANJUNATH MOGER",
        "usn": "4SH23CS030",
        "dept": "CSE",
        "email": "cmveeresh7453@gmail.com",
        "phone": "+91 9483509588",
        "is_lead": true,
        "tel_link": "tel:+919483509588",
        "wa_link": "https://wa.me/919483509588",
        "email_link": "mailto:cmveeresh7453@gmail.com"
      },
      {
        "slot": "02",
        "name": "BHAVANTEJ R",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Gagan Venkatesh Naik",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "C M Veeresh",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 01",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1QKphueamIrNukHP6sb6qzaHWCqT5Q9rv",
    "team_name": "Team SecureX",
    "event": "Final Year Project Expo",
    "project_type": "Software",
    "project_title": "SecureX - SMS Based Device Monitoring and Control System",
    "abstract": "SecureX – SMS-Based Device Monitoring and Control System is an offline mobile security application designed to protect mobile devices from loss or theft. It uses SMS communication to remotely monitor and control a device without requiring internet connectivity or cloud services. A trusted user can send SMS commands to perform actions such as location tracking, remote locking, photo capture, audio recording, and alarm activation. The system verifies the sender's registered phone number and passcode before executing any command to prevent unauthorized access. It also uses priority-based command processing to execute critical actions, such as location tracking, remote locking, and alarm activation, before normal commands. After executing a command, the system sends the result back to the trusted user through SMS. Overall, SecureX provides a reliable and secure solution for remote device monitoring and control, even without an internet connection.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/17 1:17:48 PM GMT+5:30"
  },
  {
    "id": "EMBERS-002",
    "track": "Track 2 & Track 3 (Expo + Paper)",
    "title": "FoodBridge:Food Donation and waste management system",
    "leaderName": "H R Thanmayi",
    "lead_name": "H R Thanmayi",
    "email": "bindya2umesh@gmail.com",
    "phone": "+91 8495916708",
    "usn": "4RA24CS013",
    "college": "RIT Hassan",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "H R Thanmayi",
        "usn": "4RA24CS013",
        "dept": "CSE",
        "email": "bindya2umesh@gmail.com",
        "phone": "+91 8495916708",
        "is_lead": true,
        "tel_link": "tel:+918495916708",
        "wa_link": "https://wa.me/918495916708",
        "email_link": "mailto:bindya2umesh@gmail.com"
      },
      {
        "slot": "02",
        "name": "Nikitha M H",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Priya K M",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Bindu M U",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "AI",
    "assignedStall": "Stall 02",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1L8jmdvb2sEAATvlwGv7Sd_viFCVpToFG",
    "team_name": "RITians",
    "event": "Both: 3rd Year Project Expo & Paper Presentation",
    "project_type": "Software",
    "project_title": "FoodBridge:Food Donation and waste management system",
    "abstract": "Project Title: FoodBridge – AI-Powered Food Donation and Waste Management System

FoodBridge is an intelligent web-based platform designed to reduce food wastage and address hunger by connecting restaurants, hotels, supermarkets, NGOs, food banks, and volunteers through a centralized digital system.

A significant amount of surplus food is discarded every day, while many underprivileged communities struggle to access nutritious meals. FoodBridge aims to bridge this gap by providing an efficient platform where food donors can list surplus food, NGOs can request available donations, and volunteers can coordinate food collection and delivery.

The platform integrates Artificial Intelligence (AI) for intelligent NGO matching, food demand prediction, and donation prioritization. Location-based services help identify nearby NGOs and optimize food collection coordination. Real-time notifications and donation tracking ensure transparency throughout the donation process. An administrative dashboard provides donation analytics, food waste statistics, and user management.

Developed using modern web technologies such as React.js, Node.js, Express.js, MongoDB, and Python-based AI services, FoodBridge aims to create a scalable and socially impactful solution.

Our vision is to transform surplus food into valuable resources, minimize food waste, strengthen community participation, and contribute towards a hunger-free and sustainable society.",
    "paper_title": "AI powered food donation and waste management system",
    "paper_domain": "AI",
    "status": "VERIFIED",
    "timestamp": "2026/11/17 6:26:23 PM GMT+5:30"
  },
  {
    "id": "EMBERS-003",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "TeachAssist: AI-Powered Notes, Assignments & Grading with Human Oversight",
    "leaderName": "Muhammad Razi m",
    "lead_name": "Muhammad Razi m",
    "email": "muhammednihal1011@gmail.com",
    "phone": "+91 8606279592",
    "usn": "4PA24AI045",
    "college": "PACE",
    "dept": "AIML",
    "department": "AIML",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Muhammad Razi m",
        "usn": "4PA24AI045",
        "dept": "AIML",
        "email": "muhammednihal1011@gmail.com",
        "phone": "+91 8606279592",
        "is_lead": true,
        "tel_link": "tel:+918606279592",
        "wa_link": "https://wa.me/918606279592",
        "email_link": "mailto:muhammednihal1011@gmail.com"
      },
      {
        "slot": "02",
        "name": "Rani  Roshan",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Hutch a Dujan Moideen",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Muhammed Nihal Cp",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 03",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1OcuSwGHow7TlUFHLyG_gSyzeb2BcFMR2",
    "team_name": "Nova",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "TeachAssist: AI-Powered Notes, Assignments & Grading with Human Oversight",
    "abstract": "TeachAssist automates classroom notes, assignments and grading. It transcribes lectures with Whisper, generates notes and questions with Gemini, posts them to Google Classroom, grades submissions against the teacher's rubric, and emails a report. Teachers approve every grade before release. Built on free tools, it saves teacher time and gives students faster, consistent feedback.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/18 5:41:07 PM GMT+5:30"
  },
  {
    "id": "EMBERS-004",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "HashPay",
    "leaderName": "Hawwa Shadiya",
    "lead_name": "Hawwa Shadiya",
    "email": "shaymaibm@gmail.com",
    "phone": "+91 9633863030",
    "usn": "4BP24EC046",
    "college": "BIT",
    "dept": "ECE",
    "department": "ECE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Hawwa Shadiya",
        "usn": "4BP24EC046",
        "dept": "ECE",
        "email": "shaymaibm@gmail.com",
        "phone": "+91 9633863030",
        "is_lead": true,
        "tel_link": "tel:+919633863030",
        "wa_link": "https://wa.me/919633863030",
        "email_link": "mailto:shaymaibm@gmail.com"
      },
      {
        "slot": "02",
        "name": "Fathima Haifa",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Fathima Ahsanath",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Shayma",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Hardware",
    "assignedStall": "Stall 04",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=11BfToAKBu4O0iHZJn1xYUEVUG6lLYQAo",
    "team_name": "Zyphora",
    "event": "3rd Year Project Expo",
    "project_type": "Hardware",
    "project_title": "HashPay",
    "abstract": "HashPay — AI-Powered Banking & Fraud Detection System

HashPay is a simulated banking application that integrates database management, full-stack development, artificial intelligence, and future IoT technology. It allows users to register accounts, deposit, withdraw, transfer virtual money, check balances, and view transaction history while monitoring suspicious transactions using an intelligent fraud detection system.

Technologies Used

- Database: PostgreSQL, pgAdmin 4
- Backend: Python, FastAPI, SQLAlchemy
- Frontend: React, Vite, Tailwind CSS
- Machine Learning: Python, Scikit-learn
- Hardware: ESP32, PlatformIO

Project Modules

1. Banking System: Customer registration, account creation, deposits, withdrawals, transfers, balance inquiries, and transaction history.
2. Database Management: Secure, normalized database with transaction records, ledger entries, and concurrency handling.
3. Backend Development: REST APIs for banking operations using FastAPI.
4. Frontend Development: Responsive banking dashboard with authentication and account management.
5. AI Guardian: Detects suspicious transactions using rule-based analysis and machine learning, providing risk scores and warnings.
6. Voice Banking: Malayalam voice commands for balance inquiries and payment requests.
7. IoT Integration: Future ESP32-based voice banking assistant with a microphone, speaker, and display.

Project Objective

To develop a secure, functional simulated banking ecosystem that combines modern web technologies, database management, and AI-based fraud detection, with future scope for voice-controlled IoT banking.

Development Approach

The project will be developed step by step, beginning with PostgreSQL database creation, followed by backend APIs, authentication, frontend development, AI fraud detection, voice banking, and IoT integration. Each module will be implemented and tested before proceeding to the next.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/18 9:29:36 PM GMT+5:30"
  },
  {
    "id": "EMBERS-005",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "SKILL SWAP CAMPUS",
    "leaderName": "Aysha ibrahim",
    "lead_name": "Aysha ibrahim",
    "email": "2ab24cs028@anjuman.edu.in",
    "phone": "+91 9591479462",
    "usn": "2ab24cs028",
    "college": "Anjuman institute of technology and management-bhatkal",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Aysha ibrahim",
        "usn": "2ab24cs028",
        "dept": "CSE",
        "email": "2ab24cs028@anjuman.edu.in",
        "phone": "+91 9591479462",
        "is_lead": true,
        "tel_link": "tel:+919591479462",
        "wa_link": "https://wa.me/919591479462",
        "email_link": "mailto:2ab24cs028@anjuman.edu.in"
      },
      {
        "slot": "02",
        "name": "Aysha sadiqua",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Aysha saman",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Hajeera noorain",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 05",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1QWnRLuOqx8zIJWFVBWKSLRXM55F_FR_w",
    "team_name": "QUARIX",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "SKILL SWAP CAMPUS",
    "abstract": "SkillSwap is a student-centric peer-to-peer skill exchange platform designed to encourage collaborative learning among students. It allows students to share the skills they possess and learn new skills from others in return. Students can create profiles, list the skills they can teach, mention the skills they want to learn, and connect with other students based on their interests and requirements.

The platform aims to create a collaborative learning environment where students can exchange knowledge, improve their abilities, and develop practical skills without depending entirely on paid courses. By connecting students with complementary skills, SkillSwap promotes knowledge sharing, teamwork, and continuous learning.

Key Features:

- Student registration and login.
- Student profiles and skill listings.
- Add skills to teach and skills to learn.
- Search and discover available skills.
- Match students based on their learning interests.
- Connect with other students for skill exchange.
- Dashboard to manage skills and connections.

Objective: To provide an accessible platform where students can learn, teach, and exchange skills through peer-to-peer collaboration.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/19 7:09:48 PM GMT+5:30"
  },
  {
    "id": "EMBERS-006",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "SAATHI -Chronic Disease Follow-up & Preventive Care Nudging",
    "leaderName": "ANITA ANIL KAMAT",
    "lead_name": "ANITA ANIL KAMAT",
    "email": "jeevancnaik4788@gmail.com",
    "phone": "+91 7353940870",
    "usn": "4CB24IS039",
    "college": "CANARA ENGINEERING COLLEGE",
    "dept": "INFORMATION SCIENCE AND ENGINEERING",
    "department": "INFORMATION SCIENCE AND ENGINEERING",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "ANITA ANIL KAMAT",
        "usn": "4CB24IS039",
        "dept": "INFORMATION SCIENCE AND ENGINEERING",
        "email": "jeevancnaik4788@gmail.com",
        "phone": "+91 7353940870",
        "is_lead": true,
        "tel_link": "tel:+917353940870",
        "wa_link": "https://wa.me/917353940870",
        "email_link": "mailto:jeevancnaik4788@gmail.com"
      },
      {
        "slot": "02",
        "name": "MAHALAXMI VISHNU SHANBHAG",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Kritharth Jain",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Jeevan Chandrahas Naik",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 06",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1MyRRQzF7a_lUc_uuv2v6gDr7_FmSc2do",
    "team_name": "NOTHING",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "SAATHI -Chronic Disease Follow-up & Preventive Care Nudging",
    "abstract": "SAATHI: Chronic Disease Follow-up & Preventive-Care Nudging  is designed to support the continuous management of chronic conditions such as diabetes and hypertension, where patients require regular follow-up, medication adherence, and preventive screening. The system connects Patients, Doctors, Reception Staff, and Administrators through a coordinated digital platform to improve healthcare accessibility, efficiency, and patient care.

SAATHI is developed using Flutter for the application interfaces, FastAPI (Python) for backend services and REST APIs, and MySQL for structured data storage. The system incorporates role-based authentication, doctor consultation, vitals entry, prescription management, patient visit records, and administrative staff management to streamline healthcare operations.

The platform includes a structured medicine catalogue, prescription validation, voice-assisted consultation with mandatory doctor verification, live clinical data integration, and medication reminders with Taken/Snooze/Skip adherence tracking. It also provides Vitals History with pagination and filtering, patient profile management, and multilingual support in English, Hindi, and Kannada, ensuring improved accessibility and usability.

Overall, Project SAATHI aims to provide an integrated, reliable, and user-friendly healthcare management solution that enhances communication between patients and healthcare providers, promotes medication adherence, simplifies clinical workflows, and supports effective chronic disease follow-up and preventive care.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/19 7:51:56 PM GMT+5:30"
  },
  {
    "id": "EMBERS-007",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "CareConnect",
    "leaderName": "Mariyam Munisha",
    "lead_name": "Mariyam Munisha",
    "email": "",
    "phone": "+91 7306293545",
    "usn": "",
    "college": "Bearys Institute of Technology Mangalore",
    "dept": "",
    "department": "",
    "membersCount": 3,
    "members": [
      {
        "slot": "01",
        "name": "Mariyam Munisha",
        "usn": "",
        "dept": "",
        "email": "",
        "phone": "+91 7306293545",
        "is_lead": true,
        "tel_link": "tel:+917306293545",
        "wa_link": "https://wa.me/917306293545",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "Fathima Rouha",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Afeefa Arshida",
        "is_lead": false
      }
    ],
    "member_count": 3,
    "domain": "Software",
    "assignedStall": "Stall 07",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1zBgRU6Wz9GACZtJ5FngcBZpHytVy7AAw",
    "team_name": "Team Trident",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "CareConnect",
    "abstract": "Care Connect is a care coordination platform that helps families look after elderly parents living far away. Many older adults live alone while their children worry about their safety and health; Care Connect bridges this gap with simple, respectful technology.

Parents use one-tap daily check-ins (\"I'm okay\", \"I want to talk\", \"I need help\"), request calls or help, and view medicine reminders and health readings. Caretakers get a dedicated dashboard to monitor check-ins, acknowledge requests and mark them as handled. A multilingual AI assistant with voice and text support in English, Hindi, Malayalam and Kannada lets parents communicate in their own language.

Privacy is central: health information is shared only with caretakers the parent approves. Developed as a web application prototype with an AI chatbot and role-based dashboards, Care Connect shows how inclusive technology can strengthen family bonds and create social impact.

Keywords: elderly care, caretaker dashboard, multilingual AI assistant, health reminders, social impact",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/19 11:04:28 PM GMT+5:30"
  },
  {
    "id": "EMBERS-008",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "GUARDIAN-AI: AI-enabled Human Safety and Emergency Response System",
    "leaderName": "Kadeejath Rushafida",
    "lead_name": "Kadeejath Rushafida",
    "email": "suhanasherin05@gmail.com",
    "phone": "+91 7306985072",
    "usn": "4PA23CS027",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Kadeejath Rushafida",
        "usn": "4PA23CS027",
        "dept": "CSE",
        "email": "suhanasherin05@gmail.com",
        "phone": "+91 7306985072",
        "is_lead": true,
        "tel_link": "tel:+917306985072",
        "wa_link": "https://wa.me/917306985072",
        "email_link": "mailto:suhanasherin05@gmail.com"
      },
      {
        "slot": "02",
        "name": "Khadeejath farisa",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Jameelat Mafna Haneefa",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Ayshath Suhana Sherin",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 08",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1xC_N4Wp-vkGGaHMeTzN8pDHwpbXQGYjL",
    "team_name": "Vector nova",
    "event": "Final Year Project Expo",
    "project_type": "Software",
    "project_title": "GUARDIAN-AI: AI-enabled Human Safety and Emergency Response System",
    "abstract": "GuardianAI is an Android-based personal safety application designed to help users respond quickly during emergency situations. The application provides an SOS feature and speech recognition to accept voice input for emergency activation. It uses GPS to obtain the user's location and captures photo, video, and audio evidence to support emergency reporting. Emergency alerts containing relevant information can be sent to registered emergency contacts through SMS. The application is developed using Kotlin and Jetpack Compose, with Supabase for cloud authentication and data storage. Room Database is used to store emergency information locally when internet connectivity is unavailable, while WorkManager supports background synchronization when connectivity is restored. By integrating SOS activation, speech recognition, location tracking, evidence capture, emergency alerts, and offline data handling into a single mobile application, GuardianAI aims to improve personal safety and support faster emergency response.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/20 10:25:43 AM GMT+5:30"
  },
  {
    "id": "EMBERS-009",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "NDLIMS – National Digital Life Incident Management System",
    "leaderName": "Fathimath Jaseera A",
    "lead_name": "Fathimath Jaseera A",
    "email": "4pa23cs001@pace.edu.in",
    "phone": "+91 9562607811",
    "usn": "4PA23CS001",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Fathimath Jaseera A",
        "usn": "4PA23CS001",
        "dept": "CSE",
        "email": "4pa23cs001@pace.edu.in",
        "phone": "+91 9562607811",
        "is_lead": true,
        "tel_link": "tel:+919562607811",
        "wa_link": "https://wa.me/919562607811",
        "email_link": "mailto:4pa23cs001@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Ayshath Marva P.M",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Fathima Fida AH",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Amna",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 09",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1DQ9wqwW9yg3vMb5cUnCb7a5VM-phVnO4",
    "team_name": "CyberResQ",
    "event": "Final Year Project Expo",
    "project_type": "Software",
    "project_title": "NDLIMS – National Digital Life Incident Management System",
    "abstract": "In today's digital world, cyber fraud, online harassment, identity theft, and privacy violations are growing concerns, yet many individuals struggle to report incidents and obtain proper support. NDLIMS (National Digital Life Incident Management System) is a centralized platform designed to simplify digital incident reporting, management, and tracking.

The system allows users to report incidents anonymously or with their identity, upload supporting digital evidence, receive a unique Complaint ID, and monitor complaint status. It also provides an administrator module for incident review and status management, along with an AI-assisted chatbot that offers basic cyber safety guidance and victim support.

By bringing reporting, evidence management, tracking, and support into one platform, NDLIMS aims to make digital incident management more accessible, organized, and user-friendly.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/20 10:26:21 AM GMT+5:30"
  },
  {
    "id": "EMBERS-010",
    "track": "Track 3: Technical Paper Competition",
    "title": "HealthMate: A Multilingual Voice-Enabled AI Chatbot for Accessible Healthcare Assistance",
    "leaderName": "Fathimath Jaseera A",
    "lead_name": "Fathimath Jaseera A",
    "email": "4pa23cs001@pace.edu.in",
    "phone": "+91 9562607811",
    "usn": "4PA23CS001",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Fathimath Jaseera A",
        "usn": "4PA23CS001",
        "dept": "CSE",
        "email": "4pa23cs001@pace.edu.in",
        "phone": "+91 9562607811",
        "is_lead": true,
        "tel_link": "tel:+919562607811",
        "wa_link": "https://wa.me/919562607811",
        "email_link": "mailto:4pa23cs001@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Ayshath Marva P.M",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Fathima Fida AH",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Amna",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Paper Domain: Artificial Intelligence and Machine Learning (AI/ML) Subdomain: Natural Language Processing (NLP) and Conversational AI",
    "assignedStall": "PP-02",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1Q8Pfv261DK4QnNzEXeXZ2dJxKcTZr-mN",
    "team_name": "CyberResQ",
    "event": "Paper Presentation",
    "project_type": "",
    "project_title": "",
    "abstract": "",
    "paper_title": "HealthMate: A Multilingual Voice-Enabled AI Chatbot for Accessible Healthcare Assistance",
    "paper_domain": "Paper Domain: Artificial Intelligence and Machine Learning (AI/ML) Subdomain: Natural Language Processing (NLP) and Conversational AI",
    "status": "VERIFIED",
    "timestamp": "2026/11/20 12:11:26 PM GMT+5:30"
  },
  {
    "id": "EMBERS-011",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Fly Together - Crowdsourced Group Flight Booking for Solo Travelers.",
    "leaderName": "Mithali S",
    "lead_name": "Mithali S",
    "email": "sowmyapai18@gmail.com",
    "phone": "+91 7892484339",
    "usn": "4Cb24IS048",
    "college": "Canara Engineering College",
    "dept": "Information Science and Engineering",
    "department": "Information Science and Engineering",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Mithali S",
        "usn": "4Cb24IS048",
        "dept": "Information Science and Engineering",
        "email": "sowmyapai18@gmail.com",
        "phone": "+91 7892484339",
        "is_lead": true,
        "tel_link": "tel:+917892484339",
        "wa_link": "https://wa.me/917892484339",
        "email_link": "mailto:sowmyapai18@gmail.com"
      },
      {
        "slot": "02",
        "name": "Akshitha",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Ishani S G",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "M Sowmya Pai",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 10",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1fe1UbvXdt_kgUSHFqkdKOr4m3Wy56aLE",
    "team_name": "Travora",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Fly Together - Crowdsourced Group Flight Booking for Solo Travelers.",
    "abstract": "Solo travelers typically pay higher airfare because airlines reserve discounted group rates for bookings of 10 or more passengers. Fly Together (by Team TRAVORA) bridges this gap by pooling solo flyers heading to the same destination within a 24-hour window.

To guarantee commitment and unlock group fares, the platform uses a refundable ₹2,000 Escrow Token Lock and a Live Tiered Discount calculator that triggers once 10 travelers join a route pool. Built with React, Node.js, Express, PostgreSQL, Amadeus Flight API, and Razorpay Test Escrow, the prototype lowers ticket costs for students and solo travelers (saving ₹2,370+ on routes like Delhi–Mangaluru) while helping airlines fill seats efficiently.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/20 1:50:53 PM GMT+5:30"
  },
  {
    "id": "EMBERS-012",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "JalSetu - AI Powered Integrated Water Intelligence Platform",
    "leaderName": "Mohammed Faizan Aliku",
    "lead_name": "Mohammed Faizan Aliku",
    "email": "",
    "phone": "+91 7829062140",
    "usn": "",
    "college": "AITM",
    "dept": "",
    "department": "",
    "membersCount": 2,
    "members": [
      {
        "slot": "01",
        "name": "Mohammed Faizan Aliku",
        "usn": "",
        "dept": "",
        "email": "",
        "phone": "+91 7829062140",
        "is_lead": true,
        "tel_link": "tel:+917829062140",
        "wa_link": "https://wa.me/917829062140",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "Sahil Nalaband",
        "is_lead": false
      }
    ],
    "member_count": 2,
    "domain": "Software",
    "assignedStall": "Stall 11",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=135I5GB5M4w8hIE9Zy2RIirNcwOSXQyQE",
    "team_name": "Auditore Vanguard",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "JalSetu - AI Powered Integrated Water Intelligence Platform",
    "abstract": "JalSetu is an AI powered water intelligence platform designed to address fragmented environmental monitoring in India. Currently, satellite observations, groundwater measurements, and rainfall records are maintained across separate systems, making it difficult to identify water-related changes accurately.

JalSetu integrates these datasets into a unified, interactive platform where users can select a region, compare historical lake-area changes, visualize groundwater trends, and analyze rainfall patterns. The system aligns observations geographically and seasonally, identifies discrepancies, and highlights missing or unreliable data. AI assists in generating understandable, source-backed environmental assessments with clear data-quality indicators.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/20 7:32:43 PM GMT+5:30"
  },
  {
    "id": "EMBERS-013",
    "track": "Track 3: Technical Paper Competition",
    "title": "Artificial Digital Environments for Advanced Cyber Deception: Beyond Traditional Honeypots.",
    "leaderName": "Sheikh Mohammed Sarfaraz Ali",
    "lead_name": "Sheikh Mohammed Sarfaraz Ali",
    "email": "4pa25ic005@pace.edu.in",
    "phone": "+919035496511",
    "usn": "4pa25ic005",
    "college": "PACE",
    "dept": "CSE-ICSB",
    "department": "CSE-ICSB",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Sheikh Mohammed Sarfaraz Ali",
        "usn": "4pa25ic005",
        "dept": "CSE-ICSB",
        "email": "4pa25ic005@pace.edu.in",
        "phone": "+919035496511",
        "is_lead": true,
        "tel_link": "tel:+919035496511",
        "wa_link": "https://wa.me/919035496511",
        "email_link": "mailto:4pa25ic005@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Ihthisham Moosa",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Rayyan Abdulla Shaikh",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Ahmed Razik",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Cyber Security",
    "assignedStall": "PP-03",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1QfdDb7tF1F2rGPASd2Y820wRseXaLH5-",
    "team_name": "Nocturnals",
    "event": "Paper Presentation",
    "project_type": "",
    "project_title": "",
    "abstract": "",
    "paper_title": "Artificial Digital Environments for Advanced Cyber Deception: Beyond Traditional Honeypots.",
    "paper_domain": "Cyber Security",
    "status": "VERIFIED",
    "timestamp": "2026/11/21 1:04:47 PM GMT+5:30"
  },
  {
    "id": "EMBERS-014",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Smart Pan Tilt Object tracking system",
    "leaderName": "Keerthana Jambigi",
    "lead_name": "Keerthana Jambigi",
    "email": "Lochanakanade15@ gmail.com",
    "phone": "+91 8088349380",
    "usn": "4CB24EC029",
    "college": "Canara engineering college",
    "dept": "ECE",
    "department": "ECE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Keerthana Jambigi",
        "usn": "4CB24EC029",
        "dept": "ECE",
        "email": "Lochanakanade15@ gmail.com",
        "phone": "+91 8088349380",
        "is_lead": true,
        "tel_link": "tel:+918088349380",
        "wa_link": "https://wa.me/918088349380",
        "email_link": "mailto:Lochanakanade15@ gmail.com"
      },
      {
        "slot": "02",
        "name": "Harshita Ramesh Sapaliga",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Priya K E",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Lochana G Kanade",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Hardware",
    "assignedStall": "Stall 12",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1a5jEghzEkS8KRIwCgYRhRm3I739XIIoR",
    "team_name": "Tech girls",
    "event": "3rd Year Project Expo",
    "project_type": "Hardware",
    "project_title": "Smart Pan Tilt Object tracking system",
    "abstract": "Farmers often face problems when wild animals enter agricultural fields and damage crops. Monitoring large fields continuously is difficult and requires more time and effort.To solve this problem, we propose a Smart Pan-Tilt Animal Detection and Tracking System. It uses a camera and AI technology to detect animals in real time. When an animal is detected, an ESP32 microcontroller controls two servo motors to move the camera horizontally and vertically, following the animal's movement.The system aims to help farmers monitor their fields, reduce crop damage, save time, and improve agricultural safety using a low-cost and smart solution.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/21 2:06:29 PM GMT+5:30"
  },
  {
    "id": "EMBERS-015",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Data-Driven Career Recommendation and Job Application Management System Using Machine Learning”",
    "leaderName": "Mohammad sinan",
    "lead_name": "Mohammad sinan",
    "email": "Kathijafahanana15@gmail.com",
    "phone": "+91 9741101310",
    "usn": "4DM24CD012",
    "college": "Yenepoya institute of technology",
    "dept": "Data science",
    "department": "Data science",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Mohammad sinan",
        "usn": "4DM24CD012",
        "dept": "Data science",
        "email": "Kathijafahanana15@gmail.com",
        "phone": "+91 9741101310",
        "is_lead": true,
        "tel_link": "tel:+919741101310",
        "wa_link": "https://wa.me/919741101310",
        "email_link": "mailto:Kathijafahanana15@gmail.com"
      },
      {
        "slot": "02",
        "name": "Beebi Mashitha",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Simra banu",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Fahana",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 13",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1c3vOwNjAMBZ1PRVAYOutolPOZHNTn_-i",
    "team_name": "Mohammad sinan",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Data-Driven Career Recommendation and Job Application Management System Using Machine Learning”",
    "abstract": "This project develops a machine learning-based system that recommends suitable career paths and job opportunities for students based on their skills, interests, educational qualifications, certifications, and projects using algorithms such as Random Forest, Decision Tree, and Logistic Regression. It also identifies skill gaps, suggests relevant courses for improvement, and provides a job application management feature to track application statuses and help students make better career decisions.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/21 2:54:11 PM GMT+5:30"
  },
  {
    "id": "EMBERS-016",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "AquaVision",
    "leaderName": "Thapsiya",
    "lead_name": "Thapsiya",
    "email": "nawazcvr303@gmail.com",
    "phone": "+91 7204143498",
    "usn": "4SH24AD002",
    "college": "Shree devi institute of technology",
    "dept": "AIDS",
    "department": "AIDS",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Thapsiya",
        "usn": "4SH24AD002",
        "dept": "AIDS",
        "email": "nawazcvr303@gmail.com",
        "phone": "+91 7204143498",
        "is_lead": true,
        "tel_link": "tel:+917204143498",
        "wa_link": "https://wa.me/917204143498",
        "email_link": "mailto:nawazcvr303@gmail.com"
      },
      {
        "slot": "02",
        "name": "Aafiya",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Ihsan",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Nawaz",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 14",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1vB7209sLXOrjyUmKQkjz7j3oSq4PPR4d",
    "team_name": "Aquavision",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "AquaVision",
    "abstract": "Aqua Vision – Urban Flood Monitoring and Simulation System

Aqua Vision is a smart urban flood monitoring and simulation system designed to visualize and analyze the potential impact of flooding in urban areas. The project focuses on a 1 km × 1 km urban region divided into smaller grid cells to simulate the movement and accumulation of water based on terrain elevation and rainfall intensity. Using a 3D visualization of the urban landscape, the system demonstrates water flow between grid cells, flood intensity, IoT-based sensor monitoring, rainfall visualization, and potential evacuation routes. It also highlights vulnerable locations such as schools and hospitals and provides flood risk alerts based on simulated conditions. The project aims to improve flood awareness, support emergency planning, and demonstrate how technology, simulation, and intelligent monitoring can contribute to smarter and safer urban environments.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/21 2:56:19 PM GMT+5:30"
  },
  {
    "id": "EMBERS-017",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "SCENE SYNTHESIS",
    "leaderName": "SAROSH SALMAN",
    "lead_name": "SAROSH SALMAN",
    "email": "",
    "phone": "+91 9567409402",
    "usn": "",
    "college": "PACE",
    "dept": "",
    "department": "",
    "membersCount": 3,
    "members": [
      {
        "slot": "01",
        "name": "SAROSH SALMAN",
        "usn": "",
        "dept": "",
        "email": "",
        "phone": "+91 9567409402",
        "is_lead": true,
        "tel_link": "tel:+919567409402",
        "wa_link": "https://wa.me/919567409402",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "AZEEM AHAMMED VK",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "MOHAMMED SAUD",
        "is_lead": false
      }
    ],
    "member_count": 3,
    "domain": "Software",
    "assignedStall": "Stall 15",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1aOjcs749HEPKGi5cUngVOxZdRkWj-OuX",
    "team_name": "VARITAS",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "SCENE SYNTHESIS",
    "abstract": "Scene Synthesis is an AI-powered forensic investigation support system designed to assist investigators in analysing crime-scene evidence and understanding complex cases. The system processes multiple forms of evidence, including crime-scene photographs, forensic reports, witness statements, and digital records, to identify meaningful correlations and support event reconstruction.

Unlike conventional systems that primarily store or summarise evidence, Scene Synthesis focuses on connecting information from different sources, identifying contradictions, highlighting investigative gaps, and generating relevant investigative leads. It presents findings through structured case summaries, evidence correlations, chronological event reconstructions, and an interactive Evidence Nexus that allows investigators to explore relationships between evidence, individuals, and events.

To ensure evidence integrity, the system incorporates SHA-256 hashing and a tamper-evident ledger to track evidence records and preserve their history. It also maintains previous analysis records, allowing findings to be reviewed as new evidence is introduced.

The proposed system aims to improve the organisation, interpretation, and traceability of forensic information while reducing the effort required to examine large volumes of evidence. Scene Synthesis serves as an investigative support tool, assisting human investigators in making informed decisions without replacing professional forensic judgement or determining guilt.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/21 4:49:02 PM GMT+5:30"
  },
  {
    "id": "EMBERS-018",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Dead Man Switch",
    "leaderName": "Fateen Nadish",
    "lead_name": "Fateen Nadish",
    "email": "",
    "phone": "+91 9895999829",
    "usn": "",
    "college": "PACE",
    "dept": "",
    "department": "",
    "membersCount": 3,
    "members": [
      {
        "slot": "01",
        "name": "Fateen Nadish",
        "usn": "",
        "dept": "",
        "email": "",
        "phone": "+91 9895999829",
        "is_lead": true,
        "tel_link": "tel:+919895999829",
        "wa_link": "https://wa.me/919895999829",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "Moideen Ahammed Mahzoom",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Abdul Hadi Shafareen",
        "is_lead": false
      }
    ],
    "member_count": 3,
    "domain": "Software",
    "assignedStall": "Stall 16",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1bkAA_6N_YvAZP-A22NEeDKmu0qVn86G8",
    "team_name": "SOC",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Dead Man Switch",
    "abstract": "Journalists and whistleblowers who hold evidence of corruption can be silenced or can disappear before they are able to publish it. Dead Man’s Switch is a prototype that keeps encrypted evidence safe while its owner checks in every day, and releases it automatically if the check-ins stop. The owner’s phone encrypts the evidence and sends signed daily check-ins to a smart contract that works as a public, tamper-proof timer. If check-ins stop for 2 days, the owner’s trusted contacts are alerted. If they stop for 5 days, the decryption key is displayed on the same public, read-only site that stores the evidence, so that anyone can view it. The project combines applied cryptography, blockchain and a phone acting as an edge device.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/22 12:16:24 AM GMT+5:30"
  },
  {
    "id": "EMBERS-019",
    "track": "Track 3: Technical Paper Competition",
    "title": "Novelty detection in rover-based planetary surface images using autoencoders",
    "leaderName": "Fathimathul Faleela",
    "lead_name": "Fathimathul Faleela",
    "email": "",
    "phone": "+91 9019586906",
    "usn": "",
    "college": "PACE",
    "dept": "",
    "department": "",
    "membersCount": 3,
    "members": [
      {
        "slot": "01",
        "name": "Fathimathul Faleela",
        "usn": "",
        "dept": "",
        "email": "",
        "phone": "+91 9019586906",
        "is_lead": true,
        "tel_link": "tel:+919019586906",
        "wa_link": "https://wa.me/919019586906",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "Iffah Fathima",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Mariyamathul Mubasshra",
        "is_lead": false
      }
    ],
    "member_count": 3,
    "domain": "AI/Ml",
    "assignedStall": "PP-04",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1MBmwHr55q3eSAeByk9pR-pQK_MNMZd56",
    "team_name": "TechAxis",
    "event": "Paper Presentation",
    "project_type": "",
    "project_title": "",
    "abstract": "",
    "paper_title": "Novelty detection in rover-based planetary surface images using autoencoders",
    "paper_domain": "AI/Ml",
    "status": "VERIFIED",
    "timestamp": "2026/11/22 1:03:58 PM GMT+5:30"
  },
  {
    "id": "EMBERS-020",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Smart Predictive Maintenance for Industrial Machine Failure Detection and Diagnosis Using Explainable AI",
    "leaderName": "MOHAMMED SINAN K",
    "lead_name": "MOHAMMED SINAN K",
    "email": "",
    "phone": "+91 9481319207",
    "usn": "",
    "college": "PACE",
    "dept": "",
    "department": "",
    "membersCount": 3,
    "members": [
      {
        "slot": "01",
        "name": "MOHAMMED SINAN K",
        "usn": "",
        "dept": "",
        "email": "",
        "phone": "+91 9481319207",
        "is_lead": true,
        "tel_link": "tel:+919481319207",
        "wa_link": "https://wa.me/919481319207",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "MOHAMMAD RAASHID KY",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "MOHAMMED SHAWIL HABIBULLAH",
        "is_lead": false
      }
    ],
    "member_count": 3,
    "domain": "Software",
    "assignedStall": "Stall 17",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1V6uSVKIYl7_M80741mJBczd3LBo092WQ",
    "team_name": "MECH-BYTES",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Smart Predictive Maintenance for Industrial Machine Failure Detection and Diagnosis Using Explainable AI",
    "abstract": "Smart Predictive Maintenance for Industrial Machine Failure Detection and Diagnosis using Explainable AI is an AI-powered system designed to predict potential industrial machine failures before they occur. The system analyses machine sensor data and applies machine learning techniques to identify abnormal operating conditions, estimate machine health, and detect possible failures. It also uses Explainable AI techniques such as SHAP to identify and explain the factors influencing each prediction. An interactive dashboard presents machine health status, failure risk levels, predictions, and explanations, helping users make informed maintenance decisions. The main aim is to reduce unexpected machine breakdowns, minimize maintenance costs, improve equipment reliability, and support efficient industrial operations.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/22 6:54:07 PM GMT+5:30"
  },
  {
    "id": "EMBERS-021",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "AI-Driven Campus Event and Placement Analytics Portal (CampusConnect)",
    "leaderName": "Tarun Shetty",
    "lead_name": "Tarun Shetty",
    "email": "surajbanajawad13@gmail.com",
    "phone": "+91 8618541177",
    "usn": "4CB23CS165",
    "college": "Canara Engineering College",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Tarun Shetty",
        "usn": "4CB23CS165",
        "dept": "CSE",
        "email": "surajbanajawad13@gmail.com",
        "phone": "+91 8618541177",
        "is_lead": true,
        "tel_link": "tel:+918618541177",
        "wa_link": "https://wa.me/918618541177",
        "email_link": "mailto:surajbanajawad13@gmail.com"
      },
      {
        "slot": "02",
        "name": "Vikas",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Thushar Shetty",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Suraj Banajawad",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Artificial Intelligence (AI), Machine Learning (ML), and Web-Based Analytics.",
    "assignedStall": "Stall 18",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1VbVYlZ2ShAPCAxV3PBeo7m70zhYLZvEr",
    "team_name": "Alpha",
    "event": "Final Year Project Expo",
    "project_type": "Software",
    "project_title": "AI-Driven Campus Event and Placement Analytics Portal (CampusConnect)",
    "abstract": "CampusConnect: AI-Driven Campus Event and Placement Analytics Portal is a web-based platform designed to simplify and improve campus event management and placement activities.
The system provides a centralized platform where students can explore campus events, track placement opportunities, check eligibility, and analyze their placement readiness. It also includes AI-powered resume analysis to extract skills, projects, and certifications from student resumes and provide personalized recommendations based on their profiles.
The portal offers separate dashboards for students, society administrators, placement officers, and administrators. It also provides event management, placement analytics, notifications, and data visualization to support better decision-making.",
    "paper_title": "AI-Driven Campus Event and Placement Analytics Portal (CampusConnect)",
    "paper_domain": "Artificial Intelligence (AI), Machine Learning (ML), and Web-Based Analytics.",
    "status": "VERIFIED",
    "timestamp": "2026/11/22 9:50:45 PM GMT+5:30"
  },
  {
    "id": "EMBERS-022",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "SEARCH ENGINE ROBOT FOR GAS LEAK RESPONSE USING VISION-BASED HUMAN & ANIMAL DETECTION",
    "leaderName": "SUMUKHA V",
    "lead_name": "SUMUKHA V",
    "email": "shwetha23145@gmail.com",
    "phone": "+91 9995525427",
    "usn": "4SN23AI044",
    "college": "Srinivas institute of technology valachil Mangalore",
    "dept": "AIML",
    "department": "AIML",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "SUMUKHA V",
        "usn": "4SN23AI044",
        "dept": "AIML",
        "email": "shwetha23145@gmail.com",
        "phone": "+91 9995525427",
        "is_lead": true,
        "tel_link": "tel:+919995525427",
        "wa_link": "https://wa.me/919995525427",
        "email_link": "mailto:shwetha23145@gmail.com"
      },
      {
        "slot": "02",
        "name": "Suhan",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Shrutika Prakash Naik",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Shwetha",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Hardware",
    "assignedStall": "Stall 19",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1KlBAOJSrlW1Uye2okk1SAsy-3tI6Pg5N",
    "team_name": "Tetramind",
    "event": "Final Year Project Expo",
    "project_type": "Hardware",
    "project_title": "SEARCH ENGINE ROBOT FOR GAS LEAK RESPONSE USING VISION-BASED HUMAN & ANIMAL DETECTION",
    "abstract": "Gas leakage accidents in industries, factories, and residential areas create life-threatening conditions due to the presence of toxic gases, low visibility, and the high risk faced by rescue
personnel. To address this challenge, the project proposes a Search Engine Robot equipped
with an AI-powered vision system capable of detecting humans, cats, and dogs in hazardous
gas-filled environments. A high-resolution camera captures live video, which is processed using an advanced object detection model to identify victims. In addition to detection, the system
incorporates a distance-calculation algorithm based on camera focal length and object size estimation. This allows the robot to approximate how far the detected human or animal is from
the camera, enabling rescue teams to prioritize individuals based on proximity and potential
danger. The processed video stream, along with detection markers and real-time distance values, is transmitted to a web interface accessible from any device. This remote monitoring setup
helps rescue teams make faster and safer decisions without entering the hazardous zone. By
integrating live video streaming, AI detection, and distance estimation, the system significantly
improves the speed, accuracy, and safety of rescue operations during gas leak disasters.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/22 10:28:12 PM GMT+5:30"
  },
  {
    "id": "EMBERS-023",
    "track": "Track 3: Technical Paper Competition",
    "title": "Enhanced EEGNet Optimization using Lightweight  Deep Neural Network for Detecting Human Stress  Levels from Raw EEG Signals",
    "leaderName": "Fathimath mizana",
    "lead_name": "Fathimath mizana",
    "email": "fathimakalaiabdulla@gmail.com",
    "phone": "+91 8848073234",
    "usn": "4PA25AI009",
    "college": "PACE",
    "dept": "AIML",
    "department": "AIML",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Fathimath mizana",
        "usn": "4PA25AI009",
        "dept": "AIML",
        "email": "fathimakalaiabdulla@gmail.com",
        "phone": "+91 8848073234",
        "is_lead": true,
        "tel_link": "tel:+918848073234",
        "wa_link": "https://wa.me/918848073234",
        "email_link": "mailto:fathimakalaiabdulla@gmail.com"
      },
      {
        "slot": "02",
        "name": "Nafeesa Nahala Mirza H",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Khadeejath Shaifa K M",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Fathima K A",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "AI/ML– Deep Learning and EEG-Based Stress Detection.",
    "assignedStall": "PP-05",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1QYwBnQ42FNuan4QU34dA-2x0FgLPnm3m",
    "team_name": "Quadra",
    "event": "Paper Presentation",
    "project_type": "",
    "project_title": "",
    "abstract": "",
    "paper_title": "Enhanced EEGNet Optimization using Lightweight  Deep Neural Network for Detecting Human Stress  Levels from Raw EEG Signals",
    "paper_domain": "AI/ML– Deep Learning and EEG-Based Stress Detection.",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 10:50:17 AM GMT+5:30"
  },
  {
    "id": "EMBERS-024",
    "track": "Track 3: Technical Paper Competition",
    "title": "Comparative Evaluation of Large Language Models for Factual Accuracy and Hallucination Detection",
    "leaderName": "Minha Zayan",
    "lead_name": "Minha Zayan",
    "email": "Wafabafi123@gmail.com",
    "phone": "+91 8089075751",
    "usn": "4pa25ai055",
    "college": "PACE",
    "dept": "",
    "department": "",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Minha Zayan",
        "usn": "4pa25ai055",
        "dept": "",
        "email": "Wafabafi123@gmail.com",
        "phone": "+91 8089075751",
        "is_lead": true,
        "tel_link": "tel:+918089075751",
        "wa_link": "https://wa.me/918089075751",
        "email_link": "mailto:Wafabafi123@gmail.com"
      },
      {
        "slot": "02",
        "name": "Fathimathul Fida k",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "FATHIMATH SAHALA K",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Wafa Ashraf",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Artificial Intelligence",
    "assignedStall": "PP-06",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1fAtKOwHWP7ms5ELvR4s-TxbpIQw3B8yu",
    "team_name": "PIXELLE",
    "event": "Paper Presentation",
    "project_type": "",
    "project_title": "",
    "abstract": "",
    "paper_title": "Comparative Evaluation of Large Language Models for Factual Accuracy and Hallucination Detection",
    "paper_domain": "Artificial Intelligence",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 11:08:17 AM GMT+5:30"
  },
  {
    "id": "EMBERS-025",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "SheSafe",
    "leaderName": "Mohammed shakeeb",
    "lead_name": "Mohammed shakeeb",
    "email": "",
    "phone": "+918197424986",
    "usn": "4PA23CS110",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Mohammed shakeeb",
        "usn": "4PA23CS110",
        "dept": "CSE",
        "email": "",
        "phone": "+918197424986",
        "is_lead": true,
        "tel_link": "tel:+918197424986",
        "wa_link": "https://wa.me/918197424986",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "P Hasanul Rikash",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Mohammed Shinan",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Shakira",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 20",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1ER3Ud1azFSnR8tW1WnGwPpR3jPkGwV2r",
    "team_name": "LumaaX",
    "event": "Final Year Project Expo",
    "project_type": "Software",
    "project_title": "SheSafe",
    "abstract": "SheSafe is a passive-first women safety mobile application that uses smartphone sensors to detect possible distress through movement patterns. It combines risk assessment, emergency countdown, SOS alerts, GPS tracking and Guardian support. It also provides deterrence features and evidence-integrity utilities, aiming to offer an additional layer of safety through proactive emergency assistance.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 11:12:31 AM GMT+5:30"
  },
  {
    "id": "EMBERS-026",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Medic kiosk",
    "leaderName": "Samrudh",
    "lead_name": "Samrudh",
    "email": "hasanfahmee@gmail.com",
    "phone": "+91 7306075880",
    "usn": "25MCA111",
    "college": "Yenepoya deemed to be university",
    "dept": "MCA",
    "department": "MCA",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Samrudh",
        "usn": "25MCA111",
        "dept": "MCA",
        "email": "hasanfahmee@gmail.com",
        "phone": "+91 7306075880",
        "is_lead": true,
        "tel_link": "tel:+917306075880",
        "wa_link": "https://wa.me/917306075880",
        "email_link": "mailto:hasanfahmee@gmail.com"
      },
      {
        "slot": "02",
        "name": "Sharath",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Nithesh",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Hasan Fahmee",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 21",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1yc8mcIfsCRxam54FyGQ62wJ_b2n3jACm",
    "team_name": "Visionary minds",
    "event": "Final Year Project Expo",
    "project_type": "Software",
    "project_title": "Medic kiosk",
    "abstract": "Outpatient (OPD) physicians often have barely five minutes per consultation to uncover symptoms, medical history, and disease context before examining a patient—creating diagnostic pressure and slow intake queues. This project introduces a Multilingual AI Medical Kiosk that captures patient speech via Speech-to-Text (STT), structures clinical details into JSON (chief_complaint, severity_level, symptoms, duration, medication, allergy, medical_history, vitals, and case_summary), and detects missing clinical fields in real time. Using a gap-analysis loop and multilingual Text-to-Speech (TTS) in regional languages (such as Hindi, Kannada, and Tamil), the kiosk politely asks follow-up questions for unanswered parameters and delivers a concise English clinical summary to the doctor—cutting intake friction while offering flexible software-embedding and custom hardware deployment options with two years of included maintenance.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 11:47:34 AM GMT+5:30"
  },
  {
    "id": "EMBERS-027",
    "track": "Track 2 & Track 3 (Expo + Paper)",
    "title": "Pulse Track",
    "leaderName": "Shameem Muhammad",
    "lead_name": "Shameem Muhammad",
    "email": "4pa24cs100@pace.edu.in",
    "phone": "+91 9480486500",
    "usn": "4pa24cs100",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Shameem Muhammad",
        "usn": "4pa24cs100",
        "dept": "CSE",
        "email": "4pa24cs100@pace.edu.in",
        "phone": "+91 9480486500",
        "is_lead": true,
        "tel_link": "tel:+919480486500",
        "wa_link": "https://wa.me/919480486500",
        "email_link": "mailto:4pa24cs100@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Abdul Nazim",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Salma Haifa",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Salmath Afiya",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 22",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1TGuL6US5H1uWxAaXVw1fzpvvcx_aluov",
    "team_name": "Code Tracers",
    "event": "Both: 3rd Year Project Expo & Paper Presentation",
    "project_type": "Software",
    "project_title": "Pulse Track",
    "abstract": "Automatic multimodal emergency detection through native mobile APIs and alert system",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 12:03:16 PM GMT+5:30"
  },
  {
    "id": "EMBERS-028",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Hiring and scam detection",
    "leaderName": "Muhammad abdul jaleel",
    "lead_name": "Muhammad abdul jaleel",
    "email": "4pa24cs086@pace.edu.in",
    "phone": "+91 7356860161",
    "usn": "4pa24cs086",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Muhammad abdul jaleel",
        "usn": "4pa24cs086",
        "dept": "CSE",
        "email": "4pa24cs086@pace.edu.in",
        "phone": "+91 7356860161",
        "is_lead": true,
        "tel_link": "tel:+917356860161",
        "wa_link": "https://wa.me/917356860161",
        "email_link": "mailto:4pa24cs086@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Muhammad adhil P",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Muhammed Nafih CP",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Nazal noushad",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 23",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1kkjF8vhFrzGxAESZLvXOOo_gIQKqASro",
    "team_name": "Scamshield",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Hiring and scam detection",
    "abstract": "Detecting a job offer whether it’s a scam or genuine",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 12:27:14 PM GMT+5:30"
  },
  {
    "id": "EMBERS-029",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "TRUTHLENS – AI-POWERED IMAGE AUTHENTICITY AND DEEPFAKE VIDEO DETECTION SYSTEM",
    "leaderName": "Rishad P",
    "lead_name": "Rishad P",
    "email": "ssheikhmuzeeb@gmail.com",
    "phone": "+91 8590204273",
    "usn": "4PA25CS409",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Rishad P",
        "usn": "4PA25CS409",
        "dept": "CSE",
        "email": "ssheikhmuzeeb@gmail.com",
        "phone": "+91 8590204273",
        "is_lead": true,
        "tel_link": "tel:+918590204273",
        "wa_link": "https://wa.me/918590204273",
        "email_link": "mailto:ssheikhmuzeeb@gmail.com"
      },
      {
        "slot": "02",
        "name": "shezin Sakariya",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Razin Raees P",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Muzeeb.S",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 24",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1VzUuVE07BDEf1AP4LpOgx-TRNYVW6iRi",
    "team_name": "TruthLens",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "TRUTHLENS – AI-POWERED IMAGE AUTHENTICITY AND DEEPFAKE VIDEO DETECTION SYSTEM",
    "abstract": "TruthLens is an AI-powered media screening platform developed to address the growing
difficulty of distinguishing authentic digital media from AI-generated and manipulated content.
Generative adversarial networks, diffusion models and face-swapping systems can now
produce images and videos that are hard to identify by visual inspection alone. TruthLens
provides an accessible preliminary screening tool through a web-based interface and supports
two functions: AI-generated image detection and deepfake video detection.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 12:30:27 PM GMT+5:30"
  },
  {
    "id": "EMBERS-030",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Edu Assist AI",
    "leaderName": "Muhammed Ajlan",
    "lead_name": "Muhammed Ajlan",
    "email": "mushrafashraf2005@gmail.com",
    "phone": "+91 8943397983",
    "usn": "4PA24cs074",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Muhammed Ajlan",
        "usn": "4PA24cs074",
        "dept": "CSE",
        "email": "mushrafashraf2005@gmail.com",
        "phone": "+91 8943397983",
        "is_lead": true,
        "tel_link": "tel:+918943397983",
        "wa_link": "https://wa.me/918943397983",
        "email_link": "mailto:mushrafashraf2005@gmail.com"
      },
      {
        "slot": "02",
        "name": "Muhammed ribin",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Muhammed raihan",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Mushraf Ashraf",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 25",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1uYyizOY0HrGKxxMEuDGTJEKPtthePHj7",
    "team_name": "Edu Assist AI",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Edu Assist AI",
    "abstract": "EduAssist AI is a Generative AI study assistant that helps students learn from their own notes. A student uploads PDF notes, asks questions, and gets answers written only from those notes, with page references so every answer can be verified. If the notes don't cover a question, the app says so instead of guessing. It can answer in several languages, including English, Malayalam, Kannada, Hindi, Tamil and Telugu. It also creates summaries, short revision notes and MCQs, and solves previous year question papers by writing marks-based answers from the student's notes.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 12:32:20 PM GMT+5:30"
  },
  {
    "id": "EMBERS-031",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Medsafe india",
    "leaderName": "Muhammad Ifaaz Beig B",
    "lead_name": "Muhammad Ifaaz Beig B",
    "email": "nazimahamed2006@gmail.com",
    "phone": "+91 9945228115",
    "usn": "4PA24CS087",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Muhammad Ifaaz Beig B",
        "usn": "4PA24CS087",
        "dept": "CSE",
        "email": "nazimahamed2006@gmail.com",
        "phone": "+91 9945228115",
        "is_lead": true,
        "tel_link": "tel:+919945228115",
        "wa_link": "https://wa.me/919945228115",
        "email_link": "mailto:nazimahamed2006@gmail.com"
      },
      {
        "slot": "02",
        "name": "Muhammed Sinan",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Nasimuddin A R",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Nazim Ahmed",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 26",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1aXW-rpof_n2e5hHtpJ0tJFlTeyWCDQD3",
    "team_name": "Medsafe India",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Medsafe india",
    "abstract": "MedSafe India: A Hybrid AI and Deterministic Clinical Decision-Support System for Multi-Prescription Safety, Caregiver Accessibility, and Generic Cost Optimization

In India’s fragmented healthcare ecosystem, patients frequently consult multiple specialists across independent clinics, resulting in uncoordinated prescriptions, illegible handwritten medication orders, accidental duplicate active ingredients, and preventable adverse drug interactions. Furthermore, complex English medical terminology creates adherence barriers for elderly patients and caregivers, while reliance on expensive branded formulations increases out-of-pocket healthcare expenditure.

MedSafe India addresses these challenges through a progressive web application (PWA) built on a hybrid clinical architecture that decouples probabilistic generative AI from deterministic pharmacological rules. Multimodal vision models (Google Gemini 2.5 Flash) extract medication details from printed or handwritten prescriptions and normalize Indian commercial brand names into standardized International Nonproprietary Names (INN) active chemical salts. To eliminate clinical hallucination risks, these normalized salts are evaluated against deterministic rule tables stored in PostgreSQL via a Python FastAPI backend to detect cross-prescription drug–drug interactions, duplicate active ingredients, and pre-existing condition contraindications.

For patient and caregiver accessibility, the platform generates an interactive Morning–Afternoon–Night daily pill organizer governed by meal-timing protocols with one-tap WhatsApp caregiver sharing, multilingual voice readouts in English, Hindi, and Kannada, and real-time cost comparisons against government PMBJP Jan Aushadhi generic equivalents—empowering safer medication adherence and up to 80% savings on medicine costs.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 12:40:44 PM GMT+5:30"
  },
  {
    "id": "EMBERS-032",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Artificial sphincter for post colorectal sugery patients",
    "leaderName": "Mayan Sheik",
    "lead_name": "Mayan Sheik",
    "email": "mayansheik1@gmail.com",
    "phone": "+91 8105186306",
    "usn": "4pa23ec042",
    "college": "PACE",
    "dept": "ECE",
    "department": "ECE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Mayan Sheik",
        "usn": "4pa23ec042",
        "dept": "ECE",
        "email": "mayansheik1@gmail.com",
        "phone": "+91 8105186306",
        "is_lead": true,
        "tel_link": "tel:+918105186306",
        "wa_link": "https://wa.me/918105186306",
        "email_link": "mailto:mayansheik1@gmail.com"
      },
      {
        "slot": "02",
        "name": "Ibrahim sadik",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Mohammed Zuhair",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Mohideen mihad haasil",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Hardware",
    "assignedStall": "Stall 27",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=184doNWVYI0g25HElzzGYizVUmCa_SUax",
    "team_name": "TechNova",
    "event": "Final Year Project Expo",
    "project_type": "Hardware",
    "project_title": "Artificial sphincter for post colorectal sugery patients",
    "abstract": "Our project focuses on developing a wireless-controlled Artificial Sphincter system that helps regulate the opening and closing of the sphincter to control the passage of waste.
The system uses an ESP32 microcontroller to monitor pressure through a force/pressure sensor placed near the rectal region. Based on the pressure readings, the ESP32 processes the data and controls two N20 geared DC motors to operate a mechanical valve mechanism.
The motors rotate approximately 90° to open and close the valve. Wireless communication is used to transmit alerts to a wearable wristband or transmitter unit. The system also incorporates a rechargeable battery and wireless charging module for convenient power management.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 1:20:08 PM GMT+5:30"
  },
  {
    "id": "EMBERS-033",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Hidden Camera detector",
    "leaderName": "Muhammad Lisaan",
    "lead_name": "Muhammad Lisaan",
    "email": "",
    "phone": "+91 8050214636",
    "usn": "",
    "college": "PACE",
    "dept": "",
    "department": "",
    "membersCount": 2,
    "members": [
      {
        "slot": "01",
        "name": "Muhammad Lisaan",
        "usn": "",
        "dept": "",
        "email": "",
        "phone": "+91 8050214636",
        "is_lead": true,
        "tel_link": "tel:+918050214636",
        "wa_link": "https://wa.me/918050214636",
        "email_link": ""
      },
      {
        "slot": "02",
        "name": "Abdur Rahman",
        "is_lead": false
      }
    ],
    "member_count": 2,
    "domain": "Hardware",
    "assignedStall": "Stall 28",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1HTOKuEhqzCnbYksBsVCIAbnn3qQRDgdF",
    "team_name": "Trojans",
    "event": "3rd Year Project Expo",
    "project_type": "Hardware",
    "project_title": "Hidden Camera detector",
    "abstract": "Hidden cameras threaten privacy in hostels, changing rooms and rentals, yet common radio-frequency detectors miss cameras that record to SD cards without transmitting. We present a low-cost handheld detector built on an ESP32-CAM that combines three channels: passive WiFi scanning with vendor and signal-strength matching for streaming cameras; differential flash imaging, which subtracts flash-off from flash-on frames to find lens retro-reflections, for storage-only cameras; and infrared blob detection for night-vision LEDs. The channels are fused into a three-level alert (clear, suspect, high) shown on an OLED with a buzzer. We evaluate detection rate against distance and angle, and false positives on everyday reflective objects.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 1:26:51 PM GMT+5:30"
  },
  {
    "id": "EMBERS-034",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Medscan : Personalized food safety scanner system",
    "leaderName": "Siddiq khadri",
    "lead_name": "Siddiq khadri",
    "email": "4pa24cs104@pace.edu.in",
    "phone": "+91 9448779927",
    "usn": "4PA24CS104",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Siddiq khadri",
        "usn": "4PA24CS104",
        "dept": "CSE",
        "email": "4pa24cs104@pace.edu.in",
        "phone": "+91 9448779927",
        "is_lead": true,
        "tel_link": "tel:+919448779927",
        "wa_link": "https://wa.me/919448779927",
        "email_link": "mailto:4pa24cs104@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Shazma Ayesha kp",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Vijayalakshmi M",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Shahanaj K",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 29",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1jeS-4Q73do_fN9026Fje9zUNZNxZnWDu",
    "team_name": "VinArchers",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Medscan : Personalized food safety scanner system",
    "abstract": "ABSTRACT 
 
 MedScan is a mobile decision-support app built for people who have to read packaged-food labels with a medical eye: patients managing diabetes, hypertension or kidney disease. Today these users check labels by hand, and the scanner apps that exist hand every user the same generic health score, which says little about whether a product is safe for a specific person. MedScan replaces that one-size-fits-all rating with a personalized check. The user scans a product’s barcode, with OCR as a fallback when the barcode fails or the product isn’t recognized, and the app retrieves nutrition and ingredient data from Open Food Facts. It then compares that data against the user’s confirmed medical profile, so the same product can be fine for one person and flagged for another.
The core of the system is a deterministic rule engine that checks four things: allergens, sodium, sugar and medication interactions. The deterministic design is deliberate. No LLM decides a verdict, so the same inputs always produce the same output, and a health-related decision never depends on a model’s judgment or its risk of error. That also makes the rules auditable and testable by clinicians and developers alike. Requiring a “confirmed” medical profile adds a second safeguard, because the checks run only against conditions and medications the user has actually verified rather than guesses or unvalidated inputs.
Trust in a health tool depends on being able to see why it said what it said, so every flag comes with an explanation. Each one names the nutrient involved, the condition it matters for, the version of the rule that fired, and a data-confidence level. That last item matters because Open Food Facts is crowdsourced and its completeness varies, so the app tells the user how much to rely on the underlying data. Where reliable data exists, MedScan also suggests an alternative product, so a flag leads to a practical next step instead of a dead end.
Finally, MedScan is built for reproducibility and accountability. Each scan is saved together with the user’s profile, the product data and the rule versions that were in force at the time. Any past result can therefore be reconstructed exactly, even after the profile changes, the Open Food Facts entry is edited or the rules are updated. This audit trail supports debugging, clinical review and user trust, and it makes the app defensible as decision support: transparent, consistent and traceable from the barcode scan to the final verdict",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 2:16:17 PM GMT+5:30"
  },
  {
    "id": "EMBERS-035",
    "track": "Track 2 & Track 3 (Expo + Paper)",
    "title": "CyberGuard-AI Assisted Cyber Threat Intelligence and Monitoring System",
    "leaderName": "Melita Jyothi Montheiro",
    "lead_name": "Melita Jyothi Montheiro",
    "email": "kamathpoojashrim@gmail.com",
    "phone": "+91 8277230332",
    "usn": "P05AZ25S038020",
    "college": "Mangalore University ,Mangalagangothri",
    "dept": "MSc in Computer Science",
    "department": "MSc in Computer Science",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Melita Jyothi Montheiro",
        "usn": "P05AZ25S038020",
        "dept": "MSc in Computer Science",
        "email": "kamathpoojashrim@gmail.com",
        "phone": "+91 8277230332",
        "is_lead": true,
        "tel_link": "tel:+918277230332",
        "wa_link": "https://wa.me/918277230332",
        "email_link": "mailto:kamathpoojashrim@gmail.com"
      },
      {
        "slot": "02",
        "name": "Kavya B S",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Maanikya M J",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Poojashri M",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "AI/Cyber Security",
    "assignedStall": "Stall 30",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=19LZU-UVIae3ehuPV57wXgqQ-iC7WmQZo",
    "team_name": "QuadCore",
    "event": "Both: Final Year Project Expo & Paper Presentation",
    "project_type": "Software",
    "project_title": "CyberGuard-AI Assisted Cyber Threat Intelligence and Monitoring System",
    "abstract": "",
    "paper_title": "CyberGuard-AI Assisted Cyber Threat Intelligence and Monitoring System",
    "paper_domain": "AI/Cyber Security",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 4:04:29 PM GMT+5:30"
  },
  {
    "id": "EMBERS-036",
    "track": "Track 2 & Track 3 (Expo + Paper)",
    "title": "NetSentry-Intelligent Network Intrusion Detection and Real-Time Threat Intelligence System Using Machine Learning",
    "leaderName": "Varshith",
    "lead_name": "Varshith",
    "email": "nikhilpoojary50511@gmail.com",
    "phone": "+91 8147097664",
    "usn": "P05AZ25S038015",
    "college": "Mangalore University",
    "dept": "MSc in Computer Science",
    "department": "MSc in Computer Science",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Varshith",
        "usn": "P05AZ25S038015",
        "dept": "MSc in Computer Science",
        "email": "nikhilpoojary50511@gmail.com",
        "phone": "+91 8147097664",
        "is_lead": true,
        "tel_link": "tel:+918147097664",
        "wa_link": "https://wa.me/918147097664",
        "email_link": "mailto:nikhilpoojary50511@gmail.com"
      },
      {
        "slot": "02",
        "name": "Praneeth GN",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Anson D Souza",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Nikhil",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "ML/Cyber Security",
    "assignedStall": "Stall 31",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1qqbyDhhC_78CtFPVvXZV_CNVkTSIX1mB",
    "team_name": "DARK TRACE",
    "event": "Both: Final Year Project Expo & Paper Presentation",
    "project_type": "Software",
    "project_title": "NetSentry-Intelligent Network Intrusion Detection and Real-Time Threat Intelligence System Using Machine Learning",
    "abstract": "",
    "paper_title": "Intelligent Network Intrusion Detection and Real-Time Threat Intelligence System Using Machine Learning",
    "paper_domain": "ML/Cyber Security",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 4:13:11 PM GMT+5:30"
  },
  {
    "id": "EMBERS-037",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Video Conferencing KYC for Banking",
    "leaderName": "Shuhaib Sinan",
    "lead_name": "Shuhaib Sinan",
    "email": "masoodmacchu07@gmail.com",
    "phone": "+91 8431496882",
    "usn": "",
    "college": "YIASCM BALMATTA",
    "dept": "",
    "department": "",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Shuhaib Sinan",
        "usn": "",
        "dept": "",
        "email": "masoodmacchu07@gmail.com",
        "phone": "+91 8431496882",
        "is_lead": true,
        "tel_link": "tel:+918431496882",
        "wa_link": "https://wa.me/918431496882",
        "email_link": "mailto:masoodmacchu07@gmail.com"
      },
      {
        "slot": "02",
        "name": "Ibrahim Rabeeh",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Muyyadeen Ashik",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Masood",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 32",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1E7kUNckSSAVfVuBwA8Bo6E183f2F4oO4",
    "team_name": "Astra",
    "event": "Final Year Project Expo",
    "project_type": "Software",
    "project_title": "Video Conferencing KYC for Banking",
    "abstract": "Mandatory Video Know Your Customer (V-KYC) onboarding in digital banking suffers from high customer drop-off rates, lengthy call durations, and susceptibility to visual impersonation fraud. Manual document verification forces banking agents to transcribe identity details under live call pressure while remaining vulnerable to spoofed digital screens and tampered IDs. This paper presents SmartKYC, a privacy-first, real-time AI assistive overlay integrated directly into WebRTC banking video streams. Executing entirely within the client browser via WebAssembly (WASM) and WebGL, SmartKYC combines automated Optical Character Recognition (OCR) for instant form pre-filling, 128-dimensional facial embedding comparison for live biometric matching, and frame-level liveness and glare heuristics to detect spoofing attempts in sub-second latency. By processing sensitive biometric and identity frames locally without external server transmission, SmartKYC ensures strict regulatory data privacy, reduces V-KYC onboarding time by over 75%, and delivers an accessible, secure next-generation digital banking experience.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 5:02:46 PM GMT+5:30"
  },
  {
    "id": "EMBERS-038",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Smart floor cleaning robot",
    "leaderName": "Rakesh p",
    "lead_name": "Rakesh p",
    "email": "spandanagowda12@gmail.com",
    "phone": "+91 8618317383",
    "usn": "4PA24EC4051",
    "college": "PACE",
    "dept": "ECE",
    "department": "ECE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Rakesh p",
        "usn": "4PA24EC4051",
        "dept": "ECE",
        "email": "spandanagowda12@gmail.com",
        "phone": "+91 8618317383",
        "is_lead": true,
        "tel_link": "tel:+918618317383",
        "wa_link": "https://wa.me/918618317383",
        "email_link": "mailto:spandanagowda12@gmail.com"
      },
      {
        "slot": "02",
        "name": "Shahanaz",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Bhuvith u",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Spandana",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Hardware",
    "assignedStall": "Stall 33",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1P8Ao3v5XjwD1qAQbu0uDFDK90Ege7Pjy",
    "team_name": "EC TEAM",
    "event": "3rd Year Project Expo",
    "project_type": "Hardware",
    "project_title": "Smart floor cleaning robot",
    "abstract": "The Smart Floor Cleaning Robot is an ESP32-based automated cleaning system designed to reduce manual effort and make floor cleaning easier and more efficient. The ESP32 microcontroller controls the robot's movement through a motor driver and DC motors. It uses an ultrasonic sensor to detect obstacles and navigate automatically. The robot is equipped with cleaning brushes, a microfiber mop pad, and a water spray nozzle to support effective floor cleaning. The main objective of this project is to develop a low-cost, smart, and efficient automatic floor cleaning system.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 5:26:40 PM GMT+5:30"
  },
  {
    "id": "EMBERS-039",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Cow Breed Detective System",
    "leaderName": "AKASHA DINESHA HOSURA",
    "lead_name": "AKASHA DINESHA HOSURA",
    "email": "Sshank726@gmail.com",
    "phone": "+91 9972564088",
    "usn": "4PA24AI059",
    "college": "PACE",
    "dept": "AIML",
    "department": "AIML",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "AKASHA DINESHA HOSURA",
        "usn": "4PA24AI059",
        "dept": "AIML",
        "email": "Sshank726@gmail.com",
        "phone": "+91 9972564088",
        "is_lead": true,
        "tel_link": "tel:+919972564088",
        "wa_link": "https://wa.me/919972564088",
        "email_link": "mailto:Sshank726@gmail.com"
      },
      {
        "slot": "02",
        "name": "• Niyaz Ahmad",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Nagabhushan O",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "T SHASHANK",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 34",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=175jdfSPuIlw9pvfPdJKueVfjaW6Z6IOP",
    "team_name": "CyberTech",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Cow Breed Detective System",
    "abstract": "The **Cow Breed Detective System** is an AI-powered computer vision project designed to identify different cow breeds from images and live webcam input. The system uses deep learning and transfer learning techniques with the MobileNetV2 architecture to analyze cow images and predict the breed. Developed using Python, TensorFlow, Keras, and Google Colab, the model is trained on a dataset containing images of different cow breeds. After analyzing an image, the system displays the predicted breed along with a confidence percentage indicating how strongly the model supports its prediction. The project aims to provide real-time breed recognition through a webcam and includes a proposed health-observation feature that examines visible characteristics of cows. The overall objective is to develop a smart, accessible AI-based system that simplifies cattle breed identification and supports preliminary observation, while health assessment would require separate validation and veterinary expertise.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 6:09:30 PM GMT+5:30"
  },
  {
    "id": "EMBERS-040",
    "track": "Track 2 & Track 3 (Expo + Paper)",
    "title": "Cloud AI Hybrid Assistant",
    "leaderName": "Mohammed Fouzan",
    "lead_name": "Mohammed Fouzan",
    "email": "4pa24cs035@pace.edu.in",
    "phone": "+91 8147479855",
    "usn": "4PA24CS035",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Mohammed Fouzan",
        "usn": "4PA24CS035",
        "dept": "CSE",
        "email": "4pa24cs035@pace.edu.in",
        "phone": "+91 8147479855",
        "is_lead": true,
        "tel_link": "tel:+918147479855",
        "wa_link": "https://wa.me/918147479855",
        "email_link": "mailto:4pa24cs035@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Mohammed Affan Ahamed",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Iyaaz Mohammed",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Josten Joy Joseph",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "AI",
    "assignedStall": "Stall 35",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1NuXQeqFW7AyMyrDJgOvrOYVOkXb2N3dC",
    "team_name": "Team Ottawa",
    "event": "Both: 3rd Year Project Expo & Paper Presentation",
    "project_type": "Software",
    "project_title": "Cloud AI Hybrid Assistant",
    "abstract": "The Cloud Hybrid AI Assistant is a web-based application designed to improve the management of long conversations with Large Language Models (LLMs). As conversations grow, token consumption increases, context-window limitations become a challenge, and important information from previous interactions may be lost. This project aims to address these challenges through intelligent conversation context management and preservation techniques.

The system is built around two main pillars: One-Click Auto-Migration and Intelligent Conversation Compression. One-Click Auto-Migration is designed to preserve important conversational information by generating a structured Master Prompt that can be transferred into a new conversation, maintaining continuity without requiring users to manually repeat previous instructions. Intelligent Conversation Compression aims to reduce unnecessary and repeated information while preserving important context for future interactions.

These functionalities are supported by two additional pillars: the Star Feature, which allows users to assign priority levels to important messages, and Tokenization and Token Management, which monitors token consumption, estimates context usage, and provides warnings when predefined usage thresholds are reached.

The application uses web technologies, Node.js, Express, Neon PostgreSQL, Google OAuth, and AI provider communication through Portkey. Its hybrid architecture focuses on application-level context management while utilizing external AI services for language processing.

Overall, the Cloud Hybrid AI Assistant aims to provide a more efficient, organized, and context-aware conversational experience by improving information preservation, reducing unnecessary context consumption, and supporting continuity across AI conversations.",
    "paper_title": "Cloud AI hybrid Assistant",
    "paper_domain": "AI",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 7:04:41 PM GMT+5:30"
  },
  {
    "id": "EMBERS-041",
    "track": "Track 2: Project Exhibition / Expo",
    "title": "Iris based authentication system",
    "leaderName": "Fathimath sharfa",
    "lead_name": "Fathimath sharfa",
    "email": "4pa24cs009@pace.edu.in",
    "phone": "+91 9778705080",
    "usn": "4pa24cs009",
    "college": "PACE",
    "dept": "CSE",
    "department": "CSE",
    "membersCount": 4,
    "members": [
      {
        "slot": "01",
        "name": "Fathimath sharfa",
        "usn": "4pa24cs009",
        "dept": "CSE",
        "email": "4pa24cs009@pace.edu.in",
        "phone": "+91 9778705080",
        "is_lead": true,
        "tel_link": "tel:+919778705080",
        "wa_link": "https://wa.me/919778705080",
        "email_link": "mailto:4pa24cs009@pace.edu.in"
      },
      {
        "slot": "02",
        "name": "Fathima",
        "is_lead": false
      },
      {
        "slot": "03",
        "name": "Aysha azza",
        "is_lead": false
      },
      {
        "slot": "04",
        "name": "Aleemath saudha",
        "is_lead": false
      }
    ],
    "member_count": 4,
    "domain": "Software",
    "assignedStall": "Stall 36",
    "feePaid": true,
    "paymentProofUrl": "https://drive.google.com/u/5/open?usp=forms_web&id=1FJ6yYKadYBBCmCLHz1ccJLEQ2Ok4UQ16",
    "team_name": "Techheads",
    "event": "3rd Year Project Expo",
    "project_type": "Software",
    "project_title": "Iris based authentication system",
    "abstract": "The Smart Campus Management System is a web-based application designed to make campus activities more organized, efficient, and accessible. The system provides a centralized platform for managing important campus-related information and services, reducing the need for manual processes and paperwork.

The project includes different user roles, such as administrators, staff, and students, with access to features based on their responsibilities. Administrators can manage users and campus information, while staff can handle relevant academic and administrative activities. Students can access necessary information and services through the system. The backend manages user authentication, data storage, and communication between the application and database.

The main objective of the project is to digitalize campus management, improve communication, reduce manual work, and provide quick access to information. By integrating different campus activities into a single platform, the Smart Campus Management System helps create a more efficient, convenient, and technology-driven campus environment.",
    "paper_title": "",
    "paper_domain": "",
    "status": "VERIFIED",
    "timestamp": "2026/11/23 7:10:23 PM GMT+5:30"
  }
];

const DEFAULT_EMBERS_DATA = {
  schedule: DEFAULT_SCHEDULE,
  registrations: OFFICIAL_REGISTRATIONS,
  googleSheetConfig: {
    sheetCsvUrl: "",
    lastSyncedAt: "",
    syncStatus: "NOT_SYNCED"
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-embers-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let embersData = { ...DEFAULT_EMBERS_DATA };

    // Try fetching from GitHub Gist
    try {
      const gist = await fetchGist();
      if (gist.files && gist.files['embers_data.json']) {
        embersData = { ...embersData, ...JSON.parse(gist.files['embers_data.json'].content) };
      }
    } catch (e) {
      console.warn('Gist fetch warning (using in-memory fallback):', e.message);
    }

    if (req.method === 'GET') {
      return res.status(200).json(embersData);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || req.query.action || 'sync';

      // Security Check: Secret Webhook Token or Admin PIN Protection
      const SECRET_TOKEN = process.env.EMBERS_WEBHOOK_TOKEN || 'EMBERS_SYNC_2026';
      const ADMIN_PIN = process.env.ADMIN_PIN || '2026';
      const providedAuth = req.headers['x-embers-token'] || body.token || body.adminPin;

      if (providedAuth !== SECRET_TOKEN && providedAuth !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Unauthorized: Invalid x-embers-token or Admin PIN. Access Denied.' });
      }

      // 1. Google Forms Webhook or Batch Sync
      if (action === 'sync_responses' || action === 'webhook') {
        const newRows = body.records || (body.record ? [body.record] : []);
        if (Array.isArray(newRows)) {
          newRows.forEach(item => {
            const id = item.id || `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const existingIdx = embersData.registrations.findIndex(r => r.id === id || (r.email && r.email.toLowerCase() === (item.email || '').toLowerCase()));
            const record = {
              id: id,
              timestamp: item.timestamp || new Date().toISOString(),
              track: item.track || "Track 1: Embeddathon",
              title: item.title || item.projectTitle || "Untitled Project",
              college: item.college || "P.A. College of Engineering",
              dept: item.dept || "Computer Science & Engineering",
              leaderName: item.leaderName || item.name || "Participant",
              email: item.email || "",
              phone: item.phone || item.whatsapp || "",
              usn: item.usn || "",
              membersCount: item.membersCount || 1,
              members: item.members || [],
              abstract: item.abstract || "",
              domain: item.domain || "Embedded Systems & IoT",
              hardwareReq: item.hardwareReq || "None",
              feePaid: item.feePaid !== false,
              verified: item.verified || false,
              assignedStall: item.assignedStall || ""
            };

            if (existingIdx >= 0) {
              embersData.registrations[existingIdx] = { ...embersData.registrations[existingIdx], ...record };
            } else {
              embersData.registrations.push(record);
            }
          });
        }

        embersData.googleSheetConfig = {
          ...embersData.googleSheetConfig,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: "SUCCESS",
          sheetCsvUrl: body.sheetCsvUrl || embersData.googleSheetConfig.sheetCsvUrl
        };
      }

      // 2. Save Schedule edits
      else if (action === 'save_schedule') {
        if (Array.isArray(body.schedule)) {
          embersData.schedule = body.schedule;
        }
      }

      // 3. Add single manual registration
      else if (action === 'add_registration') {
        const reg = body.registration;
        if (reg) {
          reg.id = reg.id || `REG-${Date.now()}`;
          embersData.registrations.unshift(reg);
        }
      }

      // 4. Update single registration (e.g. check-in, stall allocation)
      else if (action === 'update_registration') {
        const reg = body.registration;
        if (reg && reg.id) {
          const idx = embersData.registrations.findIndex(r => r.id === reg.id);
          if (idx >= 0) {
            embersData.registrations[idx] = { ...embersData.registrations[idx], ...reg };
          }
        }
      }

      // 5. Delete registration
      else if (action === 'delete_registration') {
        const id = body.id;
        embersData.registrations = embersData.registrations.filter(r => r.id !== id);
      }

      // Persist to Gist
      try {
        await updateGistFile('embers_data.json', JSON.stringify(embersData, null, 2));
      } catch (e) {
        console.warn('Gist update warning:', e.message);
      }

      return res.status(200).json({ success: true, data: embersData });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/embers error:', err);
    return res.status(500).json({ error: err.message });
  }
};
