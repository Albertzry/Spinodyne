# Spinodyne Frontend

Medical AI Platform - React + Vite + TypeScript Frontend

## 🎨 Design System

**Clinical Minimalist** - Clean, professional interface optimized for medical professionals.

### Color Palette
- **Primary**: `#0ea5e9` (Sky 500 - TotalSpine Blue)
- **Secondary**: `#64748b` (Slate 500)
- **Background**: `#f8fafc` (Slate 50)

### Tech Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design 5.0
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Animation**: Framer Motion
- **3D Viewer**: Niivue (for MRI/NIfTI visualization)
- **Icons**: Lucide React

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

访问 `http://localhost:3000`

### Build for Production
```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/
│   ├── Layout/       # AppLayout, Sidebar, Navbar
│   ├── Medical/      # Niivue 3D Viewer components
│   └── Charts/       # Analysis visualization
├── pages/
│   ├── Dashboard/    # Main dashboard
│   └── Inference/    # AI inference interface
├── services/         # API clients (Axios)
├── store/            # State management
└── assets/           # Static assets
```

## 🔧 Configuration

- **Vite**: `vite.config.ts` - API proxy to backend:8000
- **TypeScript**: `tsconfig.json`
- **Tailwind**: `tailwind.config.js` - Custom theme colors
- **PostCSS**: `postcss.config.js`

## 🎯 Features

- ✅ Responsive sidebar navigation
- ✅ Page transition animations
- ✅ Clinical minimalist design
- ✅ TypeScript strict mode
- ✅ ESLint configured
- ✅ API proxy to FastAPI backend
