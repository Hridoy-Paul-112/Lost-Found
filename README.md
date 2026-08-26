# 🧳 Lost & Found Platform

A comprehensive web application designed to help communities report lost items, search for found belongings, and reconnect owners with their possessions quickly and efficiently. The backend is deployed on **Render**, and the frontend is hosted on **Vercel**.

## ✨ Features

- **Report Lost Items** – Users can submit detailed reports with categories, descriptions, location, and images.
- **Report Found Items** – Good Samaritans can log found items to match them with potential owners.
- **Search & Filter** – Powerful search by keywords, category, date, and location to find relevant listings.
- **Match Suggestions** – Automated (or manual) suggestions to pair lost reports with found items based on similarity.
- **User Authentication** – Secure sign-up and login with email-based **OTP (One-Time Password) verification**.
- **Email OTP via Brevo** – Uses Brevo (Sendinblue) to send verification codes for user registration, login, and password recovery.
- **User Dashboard** – View, edit, and manage your own lost/found posts and track their status.
- **Responsive Design** – Optimized for desktop, tablet, and mobile devices.
- **[Add any extra feature you have, e.g., Map Integration, Admin Panel]**

## 🚀 Tech Stack

### Frontend (Vercel)
- **Framework/Library**: [e.g., React, Vue, or plain HTML/CSS/JS]
- **Styling**: [e.g., Tailwind CSS, Bootstrap, Material-UI]
- **State Management**: [e.g., Redux, Context API, Zustand – if applicable]
- **Deployment**: Vercel

### Backend (Render)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: [e.g., MongoDB, PostgreSQL, MySQL]
- **ORM/ODM**: [e.g., Mongoose, Prisma, Sequelize]
- **Authentication**: JWT (JSON Web Tokens) + OTP verification
- **Email Service**: **Brevo** (formerly Sendinblue) – used for sending OTP codes via email
- **Deployment**: Render

### DevOps & Tools
- **Package Manager**: Yarn
- **Version Control**: Git & GitHub


