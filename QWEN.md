# Cheerleading Routine Builder - Project Context

## Project Overview

The Cheerleading Routine Builder is a comprehensive web application designed for cheerleading coaches and athletes to plan, visualize, and organize competitive cheer routines. The application supports Partner Stunts, Group Stunts, and Team routines (16 and 24 members) with a drag-and-drop interface for skill placement on an 8-count system.

### Key Features
- Drag-and-drop skill placement on an 8-count system
- Customizable skills library with pre-loaded skills across all categories
- Visual position mapping for team routines on a 7-mat layout
- BPM-based automatic count calculation
- PDF export for count sheets and position diagrams
- CSV import/export for skills management
- Dark mode support for comfortable viewing

### Supported Routine Types
- Partner Stunts (1-2 athletes)
- Group Stunts (3-8 athletes)
- Team Routines (16 and 24 athletes)

### Technologies Used
- **Vite** - Fast build tool and development server
- **React** - UI framework with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern UI components
- **React DnD Kit** - Drag and drop functionality
- **React Router** - Client-side routing
- **HTML2Canvas & jsPDF** - PDF export functionality

## Project Structure

```
/Users/neokester/cheerplan/cheer-plan-pro/
├── public/               # Static assets
├── src/                  # Source code
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
├── components.json       # Shadcn/ui component configuration
└── README.md            # Project documentation
```

### Key Configuration Files
- `vite.config.ts`: Configured to run on port 8080 with React SWC plugin
- `tailwind.config.ts`: Shadcn/ui based theme with dark mode support
- `tsconfig.json`: TypeScript configuration with path aliasing (`@/*` maps to `./src/*`)
- `components.json`: Shadcn/ui component library setup

## Building and Running

### Development
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:8080)
npm run dev
```

### Production
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Additional Scripts
- `npm run lint`: Run ESLint for code quality checks

### Dependencies
The project uses modern React tooling with:
- UI Components: Radix UI primitives via shadcn/ui
- Drag & Drop: @dnd-kit libraries
- Forms: React Hook Form with Zod validation
- Styling: Tailwind CSS with custom configuration
- Routing: React Router DOM
- Charts: Recharts
- PDF: jsPDF and html2canvas
- Icons: Lucide React

## Development Conventions

### File Structure
- Components are organized in the `src/` directory
- Path alias `@` refers to the `src/` directory
- Component library follows shadcn/ui patterns in `src/components/ui/`
- Business logic is organized in `src/lib/` and `src/hooks/`

### UI/UX Guidelines
- Dark mode support is implemented using Tailwind CSS
- Responsive design principles using Tailwind utility classes
- Accessible UI components using Radix UI primitives
- Consistent styling through the shadcn/ui component library

### Key Functionality
- Keyboard shortcuts: Arrow keys for navigation, Delete/Backspace to remove skills
- Advanced editing via Skills Library Editor
- Export capabilities: PDF for count sheets and position diagrams, CSV for skills management

## Application Entry Point

The application starts from `src/main.tsx`, which renders the `App.tsx` component into the root element. The `index.html` file includes special styling and JavaScript for PDF export progress modal, with custom dark/light theme support.

## Special Features

The application includes several unique features for cheerleading routine planning:
- Position mapping for team routines (16 and 24 athletes) using a 7-mat layout
- Skill duration handling (1, 3, or 8 counts) with automatic span
- Visual representation using different shapes (Square = Base, Circle = Mid Tier, X = Top Fly)
- BPM-based timing calculations for routine synchronization