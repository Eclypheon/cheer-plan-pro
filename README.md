# Cheerleading Routine Builder

A comprehensive web application designed for cheerleading coaches and athletes to plan, visualize, and organize competitive cheer routines. Built specifically for competitive cheerleading, it supports Partner Stunts, Group Stunts, and Team routines (16 and 24 members).

## Features

### Core Functionality
- **Drag-and-drop skill placement** on an 8-count system
- **Customizable skills library** with pre-loaded skills across all categories
- **Visual position mapping** for team routines on a 7-mat layout
- **BPM-based automatic count calculation**
- **PDF export** for count sheets and position diagrams
- **CSV import/export** for skills management
- **Dark mode support** for comfortable viewing

### Routine Types
- Partner Stunts (1-2 athletes)
- Group Stunts (3-8 athletes)
- Team Routines (16 and 24 athletes)

### Keyboard Shortcuts
- **Arrow Keys**: Navigate through the routine lines
- **Delete/Backspace**: Remove selected skills from count sheet
- **Shift + Arrow Keys**: Move selected skill and all skills after it
- **Ctrl/Cmd + Arrow Keys**: Move selected skill and all skills before it

## Quick Start

### Prerequisites
- Node.js & npm (or yarn/pnpm)
- Modern web browser

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd cheerleading-routine-builder

# Install dependencies
npm install

# Start the development server
npm run dev
```

Visit `http://localhost:8080` to access the application.

### Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## How to Use

### 1. Configure Your Routine
Set the routine length, category (Partner/Group/Team), level, and BPM at the top of the builder.

### 2. Add Skills
Browse the skills library on the left. Drag skills from the library onto the count sheet. Skills will span multiple counts based on their duration (1, 3, or 8 counts).

### 3. Customize Skills
Click on skill counts in the library to edit them. Add custom skills using the form at the bottom of each category. Delete custom skills using the trash icon.

### 4. Reposition and Delete
Drag placed skills to different positions on the count sheet. To delete, drag a skill to the trash bin that appears at the bottom of the screen.

### 5. Position Mapping (Team Categories Only)
For Team (16) or Team (24), use the position sheet below the count sheet. Drag icons to position athletes on the mat. Click icons to assign names. Use the legend: Square = Base, Circle = Mid Tier, X = Top Fly.

### 6. Advanced Editing
Visit the Skills Library Editor (link in header) for bulk editing of all skills in a table format.

### 7. Export
Export your routine to PDF or export/import your skills library as CSV.

## Technologies Used

- **Vite** - Fast build tool and development server
- **React** - UI framework with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern UI components
- **React DnD Kit** - Drag and drop functionality
- **React Router** - Client-side routing
- **HTML2Canvas & jsPDF** - PDF export functionality

## Contributing

This project is maintained by Neo Kester. For questions, suggestions, or contributions, please contact the author.

## License

This project is proprietary software. All rights reserved.

---

**Author**: Neo Kester
**Version**: 1.0.0
