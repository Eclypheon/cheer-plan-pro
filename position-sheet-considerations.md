# Position Sheet Modification Considerations

This document outlines all the interactions, dependencies, and considerations to be aware of when adding new functionality to the position sheet in the Cheerleading Routine Builder application.

## Overview

The Position Sheet is a complex component that allows users to visualize cheerleading formations and movements using position icons (bases, mid-tier, top fly) and arrows representing movement between positions.

## Core Components and Their Roles

### 1. PositionSheet.tsx
- Main container component that renders the visual grid
- Handles zoom functionality and mobile touch interactions
- Manages selection states for icons and arrows
- Coordinates with parent components for state management

### 2. PositionIcon.tsx
- Represents individual position icons (square, circle, x)
- Handles drag interactions and click events
- Displays names for icons when available

### 3. Arrow.tsx
- Represents directional arrows between positions
- Handles drag interactions and click events
- Renders arrowheads and directional indicators

### 4. PositionIconNameDialog.tsx
- Modal dialog for editing icon names
- Handles double-click interactions on icons

## Key Interactions to Consider

### 1. Drag and Drop Functionality
- **Icon Dragging**: When dragging position icons, consider:
  - Snap-to-grid behavior (36x36 grid alignment)
  - Zoom level scaling when updating positions
  - Multi-selection dragging (when multiple icons are selected)
  - Propagation logic when autoFollow is enabled
  - Mobile drag preview handling
- **Arrow Dragging**: Arrows can be dragged as a whole, affecting both start and end points
- **Collision Detection**: Custom collision detection system that prioritizes trash zones and the position sheet grid

### 2. Selection System
- **Single Selection**: Clicking an icon or arrow selects it and deselects others
- **Multi-Selection**: Rectangle selection allows selecting multiple icons/arrows
- **Toggle Selection**: Clicking a selected item toggles its selection state
- **Cross-Type Deselection**: Selecting an icon automatically deselects all arrows and vice versa
- **Keyboard Deselection**: Delete/Backspace keys delete all selected items
- **Deselect Logic**: Clicking on empty space in the sheet deselects all selected icons and arrows

### 3. Zoom and Viewport Management
- **Zoom Controls**: Slider, zoom in/out buttons, and pinch gestures (mobile)
- **Zoom Level Persistence**: Zoom state is maintained per session and applied to PDF exports
- **Coordinate Transformation**: All position calculations must account for zoom level
- **Mobile Preview**: Special mobile drag preview shows miniaturized version during mobile drags

### 4. Grid and Positioning
- **36x36 Grid System**: All positions snap to a 36x36 grid system (based on 800x600 canvas)
- **Position Validation**: New positions must be validated to avoid overlapping with existing icons
- **Preferred Positions**: Certain grid positions are preferred for team formations (rows 6, 12, 17, 22)

### 5. Propagation System (AutoFollow)
- **Line Propagation**: When autoFollow is enabled, changes propagate to subsequent lines
- **Icon Propagation**: Movement of icons, adding/removing icons, naming icons all propagate
- **Arrow Propagation**: Arrow creation, movement, and deletion propagate to subsequent lines
- **Segment Name Propagation**: Segment names propagate to subsequent lines
- **History Propagation**: Undo/redo operations must consider propagated changes across lines

### 6. History and Undo/Redo System
- **Per-Line History**: Each line maintains its own history of icon and arrow states
- **Scoped History**: History is scoped by save state slot → category → line index
- **Selection Ignoring**: History records ignore selection state changes to avoid excessive history entries
- **Propagation-Aware**: Undo/redo must handle propagated changes across multiple lines

### 7. Mobile Interactions
- **Touch Event Prevention**: Prevents scrolling and gestures during drag operations
- **Pinch-to-Zoom**: Special handling for pinch gestures to adjust zoom level
- **Mobile Preview**: Visual feedback during mobile drag operations
- **Touch Start Delay**: 200ms delay on mobile to distinguish between tap and drag

### 8. PDF Export Compatibility
- **PDF Render Mode**: Special rendering mode for PDF generation
- **State Isolation**: PDF rendering uses separate states (pdfIcons, pdfArrows, etc.)
- **Visual Consistency**: Any visual changes must render correctly in PDF format
- **Zoom Level**: PDF export may use different zoom levels than the interactive view

## State Management Considerations

### 1. Position Icons State
- **PositionIcon Type**: { id, type (square|circle|x), x, y, lineIndex, name?, selected? }
- **Selection Handling**: Update selection states without affecting other properties
- **Propagation**: Consider how changes affect subsequent lines when autoFollow is on

### 2. Arrow State
- **Arrow Type**: { id, start {x, y}, end {x, y}, lineIndex, selected? }
- **Intersection Logic**: Arrows have special intersection detection for selection rectangles
- **Arrow Tool Mode**: Special mode for drawing new arrows point-to-point

### 3. Context State
- **Selected Line**: Most operations are line-specific and depend on the selected line
- **Drag State**: Various drag states (isDraggingIcon, dragOffset, draggedIconId) affect rendering
- **Zoom State**: Zoom level affects positioning calculations and rendering
- **Selection State**: Icons and arrows maintain individual selection states that need to be managed during deselect operations

## Testing Considerations

### 1. Functional Testing
- Test drag and drop operations across different zoom levels
- Verify grid snapping works correctly at all zoom levels
- Test propagation behavior with autoFollow enabled/disabled
- Verify multi-selection and deletion functionality
- Test undo/redo functionality across multiple lines

### 2. UI Testing
- Test visual feedback for selected items
- Confirm proper rendering at different zoom levels
- Verify mobile touch interactions and previews
- Test arrow drawing mode and visual feedback

### 3. Integration Testing
- Test interaction between position sheet and count sheet
- Verify proper saving and loading of states
- Test PDF export functionality with new features
- Confirm keyboard shortcut interactions

### 4. Edge Case Testing
- Test with maximum zoom levels (100% and 25%)
- Test with no selected line (for team categories)
- Test propagation behavior when routine length changes
- Test mobile interaction without selection
- Test deselect functionality by clicking on empty areas of the sheet
- Test reset functionality to ensure all position sheet elements are properly reset

## Performance Considerations

### 1. Rendering Performance
- Component memoization to prevent unnecessary re-renders
- Efficient state updates to avoid performance bottlenecks
- Virtualization may be needed for very large formations

### 2. Interaction Performance
- Smooth drag and drop performance especially on mobile
- Quick response to zoom changes
- Efficient collision detection algorithms

## Key Dependencies to Consider

### 1. DnD Kit
- Core drag and drop functionality
- Collision detection systems
- Touch and pointer sensor management

### 2. State Management
- Parent components managing global state
- Local state management within PositionSheet
- History tracking system

### 3. External Libraries
- Coordinate transformation utilities
- Touch event handling for mobile
- PDF export functionality

## Common Modification Scenarios and Their Impact

### 1. Adding New Icon Types
- Update PositionIcon component to support new types
- Update icon creation buttons in PositionSheet header
- Consider how new types interact with team formation generation
- Update PDF rendering for new types

### 2. Adding New Arrow Features
- Modify Arrow component to support new functionality
- Update arrow creation/deletion logic
- Consider how new arrow types affect intersection detection
- Update PDF rendering for new arrow types

### 3. Modifying Grid System
- Update snap-to-grid calculations
- Adjust preferred position logic
- Consider impact on auto-generated team formations
- Update coordinate transformation logic

### 4. Enhancing Selection System
- Update selection rectangle logic
- Update multi-selection handling
- Consider interaction with cross-type deselection
- Update keyboard event handling for selection
- Preserve deselect functionality when clicking on empty space in the sheet

### 5. Reset Functionality
- The reset button in the RoutineHeader should reset all position sheet elements to their default state
- For team categories (team-16/team-24), reset generates default formation icons
- For other categories, reset clears all icons from the position sheet
- Reset should clear all arrows from all lines
- Reset should clear all segment names
- Reset should clear any selection states

## Best Practices for Position Sheet Modifications

1. **Maintain Visual Consistency**: New features should match the existing UI/UX patterns
2. **Preserve Performance**: Optimize rendering and interaction performance
3. **Consider All Zoom Levels**: Test functionality at different zoom levels
4. **Maintain Mobile Compatibility**: Ensure new features work on mobile devices
5. **Preserve History Functionality**: Ensure new features integrate with undo/redo
6. **Test Propagation Logic**: Verify how new features work with autoFollow enabled
7. **Validate PDF Export**: Confirm new features render correctly in PDFs
8. **Support Reset Functionality**: Ensure new features are properly reset when the reset button is pressed
9. **Update Documentation**: Document any new functionality for other developers