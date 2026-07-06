# 🏥 Hospital Management System

<p align="center">
  <img src="frontend/public/logo.png" width="180" alt="Hospital Management System">
</p>

<p align="center">
<strong>A modern, enterprise-grade Hospital Management System designed to digitize healthcare operations through secure patient management, admissions, prescriptions, analytics, AI-powered assistance, and institutional workflow automation.</strong>
</p>

<p align="center">

![React](https://img.shields.io/badge/React-19-blue?logo=react)

![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

![Flask](https://img.shields.io/badge/Flask-Backend-black?logo=flask)

![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)

![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success)

![Healthcare](https://img.shields.io/badge/Industry-Healthcare-red)

</p>

---

# 🏥 Project Status

## 🚀 Production Ready

This Hospital Management System has been designed as a production-grade healthcare platform.

Although it is not yet deployed for active clients, the application has been architected with scalability, modularity, and real-world hospital workflows in mind.

The project follows enterprise software practices including modular services, authentication middleware, audit logging, role-based permissions, SQL migrations, and layered backend architecture.

---

# 📖 Overview

The Hospital Management System is a comprehensive healthcare platform developed to simplify and digitize hospital operations.

The platform centralizes patient records, admissions, prescriptions, laboratory reports, staff management, pharmacy inventory, and hospital analytics into one unified system.

Designed with scalability in mind, the application separates frontend and backend services while integrating AI-powered features, PDF generation, notifications, and cloud database services.

---

# ✨ Features

## 👨‍⚕️ Patient Management

- Patient Registration
- Patient Profiles
- Medical History
- Search & Filtering
- Visit Tracking

---

## 🏥 Admission Management

- Patient Admissions
- Discharge Management
- Admission Notes
- Bed Allocation

---

## 🛏 Bed Management

- Bed Availability
- Ward Allocation
- Occupancy Monitoring
- Bed Assignment

---

## 💊 Prescription System

- Digital Prescriptions
- Drug Management
- Prescription Engine
- Medicine Inventory

---

## 🧪 Laboratory

- Lab Reports
- Report Management
- Patient Lab History

---

## 👨‍⚕️ Staff Management

- Doctors
- Nurses
- Hospital Staff
- Role Assignment
- Permission Management

---

## 📊 Dashboard

- Hospital Statistics
- Admissions Overview
- Patient Analytics
- Staff Insights
- Operational Reports

---

## 🤖 AI Features

- AI-powered Healthcare Assistance
- Intelligent Recommendations
- Automated Processing

---

## 📱 Communication

- SMS Notifications
- WhatsApp Integration
- PDF Report Generation

---

## 🔐 Security

- Authentication
- Authorization
- Role-Based Access Control
- Audit Logging
- Session Management

---

# 🏗 Architecture

The application follows a modern layered architecture.

```
                        React Frontend
                              │
                              ▼
                        Flask REST API
                              │
     ┌──────────────┬──────────┴──────────┬──────────────┐
     ▼              ▼                     ▼              ▼

 Authentication   Services            Middleware     Utilities

     ▼

 Supabase Database

     ▼

Patients
Admissions
Beds
Prescriptions
Lab Reports
Staff
Audit Logs
```

---

# 🛠 Tech Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- Vite

## Backend

- Python
- Flask

## Database

- Supabase

## Authentication

- JWT Authentication
- Role-Based Access

## Services

- AI Service
- PDF Generation
- WhatsApp Integration
- SMS Service
- Prescription Engine

## Infrastructure

- SQL Migrations
- Modular Services
- Middleware
- REST APIs

---

# 📂 Project Structure

```text
Hospital-Management-System/

frontend/
├── src/
├── components/
├── pages/
├── hooks/
├── services/

backend/
├── routes/
├── middleware/
├── services/
├── utils/
├── migrations/
├── supabase/
├── app.py

README.md
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/Hospital-Management-System.git

cd Hospital-Management-System
```

---

## Backend

```bash
cd backend

pip install -r requirements.txt

python app.py
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# 📈 Enterprise Features

- Modular Backend Architecture
- RESTful APIs
- SQL Migration System
- Authentication Middleware
- Role-Based Authorization
- Audit Trail
- PDF Report Generation
- Notification Services
- AI Service Layer
- Healthcare Workflow Automation

---

# 🚀 Future Roadmap

- Electronic Health Records (EHR)
- Medical Imaging
- Appointment Scheduling
- Billing & Insurance
- Inventory Management
- Multi-Hospital Support
- Doctor Mobile App
- Patient Portal
- Telemedicine
- AI Clinical Decision Support

---

# 💡 Design Goals

The project was built with the objective of simulating the architecture of a production healthcare platform rather than a simple academic CRUD application.

Key goals include:

- Scalability
- Modular Design
- Maintainability
- Security
- Extensibility
- Separation of Concerns
- Enterprise Architecture

---

# 📄 License

Apache License 2.0

---

# 👨‍💻 Author

**Shis Maheta**

🏆 National-Level Hackathon Winner

💻 Full Stack Developer

🤖 AI Developer

🏥 Healthcare Software Developer

---

# ⭐ Support

If you found this project interesting, consider giving it a ⭐ on GitHub.

---

> **Note:** This project is intended as a production-ready healthcare management platform. While it is not currently deployed for active hospital clients, it has been architected with real-world healthcare workflows, modular backend services, and enterprise software engineering principles in mind.
