# StaySafe

Multi-role (Guest / Customer / Room Owner / Admin) accommodation platform demo built with React, Vite, Tailwind CSS and lucide-react.

## Run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Structure

```
src/
  main.jsx
  index.css
  App.jsx                      # state + routing between views
  data/                        # initial properties, notifications, chatbot KB
  components/                  # Header, RoleSwitcher, Footer, ChatbotWidget, NotificationCenterDrawer
  pages/                       # Homepage, Listing, Detail, Booking
  pages/dashboards/            # Customer, Owner, Admin dashboards
```
