# INAI

INAI is a hostel student matching micro project. It supports registration, login, study partner matching, roommate matching, connection requests, profile editing, an admin page, and a Pomodoro break mini-game.

## Setup

1. Open the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment settings:

```bash
copy .env.example .env
```

Then update `.env` with your MongoDB Atlas connection string and admin password.

4. Seed demo accounts:

```bash
npm run seed
```

5. Start the backend:

```bash
npm start
```

6. Open `index.html` in your browser.

## Demo Accounts

- **Saravanavelu M**: `velu12`
- **Priya D**: `priya12`
- **Muthu Pandi K**: `muthu12`
- **Anjali Devi S**: `anjali12`
- **John Wesley J**: `john12`

## Admin

Open `admin.html` and enter the `ADMIN_PASSWORD` value from `backend/.env`.

## Notes

- Passwords are stored using server-side PBKDF2 hashing.
- The forgot-password flow resets a password using registered name, room number, and state.
- MongoDB credentials are loaded from `backend/.env`, not hardcoded in the server file.
