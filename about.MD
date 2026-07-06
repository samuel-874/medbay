# MedBay – Hospital Patient Management System

## Overview

**MedBay** is a simple, modern, and user-friendly Hospital Patient Management System designed to improve the management of patient records, appointments, and staff operations within a healthcare facility.

The system is being developed as a **Final Year Project**, with the primary focus on **patient-centered care**, simplicity, efficiency, and ease of use. The interface should be clean, uncluttered, and intuitive, with a **navy green** theme that provides a calm, professional, and welcoming experience.

---

# System Objectives

The primary objectives of MedBay are to:

- Digitize patient registration and record management.
- Improve the speed and accuracy of patient information retrieval.
- Simplify appointment scheduling.
- Manage hospital staff accounts and duty schedules.
- Reduce manual record-keeping errors.
- Generate patient identification cards automatically.
- Provide a secure role-based authentication system.

---

# User Roles

## 1. Admin (Manager)

The system comes with a **default administrator account**.

The Admin acts as the hospital manager and has full access to the system.

### Responsibilities

- Create staff accounts.
- Edit staff information.
- Remove staff accounts.
- Assign staff duty schedules/shifts.
- View overall hospital activities.
- Access reports and activity logs.
- Manage system settings.

### Staff Account Information

When creating a staff account, the Admin provides:

- Username
- Phone Number
- PIN (used for authentication)

---

## 2. Staff

Staff members are the primary day-to-day users of the application.

They are responsible for handling patient-related operations but have limited permissions compared to the Admin.

### Responsibilities

- Register new patients.
- View patient information.
- Update patient records.
- Manage appointments.
- Search for patient records.
- View assigned duty schedules.
- Print or regenerate patient ID cards.

---

# Core Features

## 1. Authentication & Access Control

The application should implement secure role-based authentication.

### Admin Permissions

- Full system access.
- Manage staff.
- Manage duty schedules.
- View all patients.
- Access reports and logs.

### Staff Permissions

- Login to the system.
- Register patients.
- Update patient records.
- Schedule appointments.
- View assigned duties.
- Search patients.

---

## 2. Patient Registration

Staff should be able to register new patients.

### Required Information

- First Name
- Last Name
- Phone Number
- Auto-generated Patient ID
- Blood Group
- Gender
- Date of Birth
- Address
- Next of Kin
- Emergency Contact

The system automatically generates a **unique Patient ID** during registration.

---

## 3. Patient ID Card Generation

Immediately after registration, the system generates a printable and downloadable patient identification card.

The ID card should contain:

- Hospital Logo (optional)
- Patient Name
- Patient ID
- Phone Number
- Blood Group
- QR Code or Barcode (for quick lookup)

The card can be printed or saved digitally.

---

## 4. Patient Records Management

Staff should be able to manage patient information efficiently.

### Features

- View patient profile
- Update patient biodata
- View visit history
- Record consultation notes
- Record diagnosis
- Record prescribed medications
- Record allergies
- Record basic medical history

---

## 5. Appointment Scheduling

The system allows appointments to be booked on behalf of patients.

### Features

- Book appointments
- Reschedule appointments
- Cancel appointments
- View daily appointments
- Prevent double-booking
- Display available time slots

Each appointment should include:

- Patient
- Assigned Staff/Doctor
- Date
- Time
- Status

---

## 6. Staff Duty Management

Only the Admin can manage staff schedules.

### Features

- Assign shifts
- Update duty rosters
- View all staff schedules
- Staff can view only their assigned schedule

---

## 7. Search & Retrieval

The system should provide fast patient lookup.

Patients can be searched using:

- Patient ID
- First Name
- Last Name
- Phone Number

Search results should be accurate and fast.

---

## 8. Dashboard

A clean dashboard provides an overview of hospital activities.

### Admin Dashboard

Displays:

- Total Patients
- Total Staff
- Today's Appointments
- Staff on Duty
- Recently Registered Patients
- Recent Activities

### Staff Dashboard

Displays:

- Today's Appointments
- Assigned Duty Schedule
- Recently Registered Patients
- Quick Search
- Quick Patient Registration

---

## 9. Activity Log

The system should maintain a simple audit trail for evaluation and accountability.

Activities to record include:

- Patient registrations
- Patient updates
- Appointment creation
- Appointment cancellation
- Staff login/logout
- Staff account creation
- Duty assignments

Each log should include:

- User
- Action
- Timestamp

This feature will help evaluate:

- Response time
- Data accuracy
- System efficiency

These metrics can also be referenced in the project's evaluation chapter.

---

# Database Entities

## Admin

- id
- username
- phoneNumber
- pin
- createdAt

---

## Staff

- id
- username
- phoneNumber
- pin
- role
- status
- createdAt

---

## Patient

- id
- patientId
- firstName
- lastName
- phoneNumber
- bloodGroup
- gender
- dateOfBirth
- address
- nextOfKin
- emergencyContact
- createdAt
- updatedAt

---

## Appointment

- id
- patientId
- assignedStaffId
- appointmentDate
- appointmentTime
- status
- notes
- createdAt

---

## DutySchedule

- id
- staffId
- shift
- date
- startTime
- endTime

---

## ActivityLog

- id
- userId
- action
- description
- timestamp

---

# User Interface Design

The user interface should be:

- Minimalistic
- Clean
- Modern
- Responsive
- Easy to navigate
- Uncluttered
- Beginner-friendly
- Patient-focused

### Theme

- Primary Color: **Navy Green**
- White backgrounds
- Soft neutral colors
- Rounded cards
- Simple icons
- Minimal animations

The application should emphasize patient management rather than unnecessary visual complexity.

---

# Technology Goals

The system should demonstrate:

- Fast response time
- Efficient data retrieval
- Accurate patient record management
- Secure authentication
- Reliable appointment scheduling
- Easy staff management
- Good usability and user experience

---

# Project Scope

MedBay focuses on solving common challenges in small to medium-sized healthcare facilities by providing:

- Digital patient registration
- Electronic patient records
- Appointment management
- Staff management
- Duty scheduling
- Patient identification card generation
- Fast patient search and retrieval
- Activity logging

The project intentionally remains lightweight and minimal, making it suitable as a Final Year Project while still demonstrating practical software engineering concepts such as authentication, CRUD operations, role-based access control, search optimization, scheduling, and database management.
