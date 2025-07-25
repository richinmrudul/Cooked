# Cooked: Personalized Meal Tracker & Ranking App

## Overview

Cooked is a full-stack web application that empowers users to log, track, and rank homemade meals with ease. Blending the functionality of a personal food journal with an intelligent ranking system, Cooked offers a unique experience for users who want to document their culinary journey, discover their top dishes, and stay consistent with their cooking habits.

## Features

- **User Authentication**
  - Secure sign-up and login using email and password
  - JWT-based authentication

- **User Profiles**
  - View and edit first name, last name, and email
  - Upload and update a profile photo (stored in Cloudinary)
  - Track cooking streaks and meal statistics

- **Meal Management**
  - Add meals with title, description, date, photo, and rating
  - View all meals in a searchable, filterable list
  - Edit or delete meals at any time

- **Meal Ranking System**
  - Compare meals head-to-head to determine preference
  - ELO-based ranking system to dynamically score meals
  - View your top-ranked meals in descending order

- **Cooking Streak Tracker**
  - Displays current and longest streak of consecutive cooking days

- **Cloud Image Hosting**
  - Meals and profile images are uploaded directly to Cloudinary for persistence and scalability

- **Responsive Design**
  - Clean and intuitive UI built with consistent styling for desktop and mobile support

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- React Router DOM
- Custom CSS

**Backend**
- Node.js
- Express
- TypeScript
- PostgreSQL (via Neon)
- `pg`, `bcryptjs`, `jsonwebtoken`
- Multer + `multer-storage-cloudinary`
- Cloudinary SDK

**Deployment**
- Frontend: Vercel
- Backend: Render
- Database: Neon (PostgreSQL)

## Getting Started (Local Development)

### 1. Clone the Repository

```bash
git clone https://github.com/richinmrudul/Cooked.git
cd Cooked
