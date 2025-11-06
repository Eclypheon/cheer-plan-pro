# Arrow Drawing Functionality - Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for the arrow drawing functionality, broken down into bite-sized chunks with clear test cases for each step.

## Step 1: Add Arrow Tool Icon to UI
### Task Description
- Add an arrow icon in the same div as the zoom slider, positioned above the magnifying glass and below the word "line"
- Implement state to track whether arrow drawing mode is active

### Implementation Details
- Add icon to existing toolbar container
- Add state to track drawing mode
- Style the icon consistently with existing UI elements

### Test Cases
- [ ] Arrow icon appears in correct location in toolbar
- [ ] Arrow icon is visually consistent with other icons
- [ ] Clicking arrow icon toggles drawing mode
- [ ] UI indicates when arrow drawing mode is active

---

## Step 2: Implement Arrow Drawing Cursor State
### Task Description
- When arrow drawing mode is active, change the cursor to a crosshair
- When exiting arrow drawing mode, restore original cursor

### Implementation Details
- Add CSS to change cursor when in arrow drawing mode
- Update cursor based on arrow drawing state

### Test Cases
- [ ] Cursor changes to crosshair when arrow tool is selected
- [ ] Cursor returns to normal when switching to other tools
- [ ] Cursor returns to normal when arrow tool is deselected
- [ ] Existing cursor functionality is not affected by other tools

---

## Step 3: Implement Arrow Drawing Interaction
### Task Description
- Implement the two-click arrow drawing flow
- First click sets start point, second click sets end point
- Show preview arrow while moving cursor after first click

### Implementation Details
- Track mouse events on position sheet canvas
- Maintain temporary arrow state during drawing
- Render preview arrow during creation

### Test Cases
- [ ] First click sets start point of arrow
- [ ] Preview arrow appears while moving cursor after first click
- [ ] Preview arrow follows cursor movement
- [ ] Second click creates permanent arrow
- [ ] Arrow is drawn between correct start and end points

---

## Step 4: Add Arrow Data Structure and State
### Task Description
- Define data structure for storing arrow information (start and end points)
- Add arrows to the application state
- Implement functions to add/remove arrows

### Implementation Details
- Define Arrow type/interface
- Add arrows array to state
- Create functions to manipulate arrow data

### Test Cases
- [ ] Arrow data structure includes necessary properties (start/end points)
- [ ] New arrows are properly added to state
- [ ] Arrow data persists correctly in application state
- [ ] Arrows can be removed from state

---

## Step 5: Render Arrows on Position Sheet
### Task Description
- Update the position sheet rendering to draw arrows
- Ensure arrows are drawn in the correct layer (below position icons, above background)

### Implementation Details
- Modify rendering logic to include arrows
- Position arrows using stored coordinates
- Style arrows appropriately

### Test Cases
- [ ] Created arrows are visible on position sheet
- [ ] Arrows are positioned correctly based on stored coordinates
- [ ] Arrows appear in correct layer relative to other elements
- [ ] Multiple arrows can be displayed simultaneously

---

## Step 6: Make Arrows Draggable
### Task Description
- Implement drag functionality for existing arrows
- When dragging an arrow, move both start and end points proportionally

### Implementation Details
- Add drag handlers for arrows
- Update arrow positions during drag
- Ensure dragging feels natural and responsive

### Test Cases
- [ ] Arrows can be dragged by clicking and holding on the arrow line
- [ ] Dragging moves both start and end points proportionally
- [ ] Arrow maintains its shape during dragging
- [ ] Arrow position is saved after drag completes

---

## Step 7: Implement Arrow Selection
### Task Description
- Allow arrows to be selected individually
- Add arrow selection to existing selection rectangle functionality
- Update UI to show selected arrows

### Implementation Details
- Add hit detection for arrows
- Integrate with existing selection system
- Add visual indicators for selected arrows

### Test Cases
- [ ] Clicking on an arrow selects it
- [ ] Selected arrows have visual indication (e.g., highlighted outline)
- [ ] Selection rectangle includes arrows in its selection
- [ ] Multiple arrows can be selected simultaneously

---

## Step 8: Add Arrow Deletion
### Task Description
- Implement ability to delete arrows
- Support deletion via delete key when arrow is selected
- Add deletion from trash can functionality

### Implementation Details
- Add event handlers for arrow deletion
- Integrate with existing deletion system
- Ensure proper state cleanup when deleting arrows

### Test Cases
- [ ] Selected arrows can be deleted with Delete key
- [ ] Arrows can be deleted by dragging to trash
- [ ] Arrow is removed from state when deleted
- [ ] Arrow disappears from position sheet when deleted

---

## Step 9: Implement Undo/Redo for Arrows
### Task Description
- Add arrow-related actions to the history system
- Support undoing/redoing arrow creation, movement, and deletion

### Implementation Details
- Update history system to track arrow changes
- Create history actions for arrow operations
- Integrate with existing undo/redo functionality

### Test Cases
- [ ] Creating an arrow can be undone
- [ ] Moving an arrow can be undone
- [ ] Deleting an arrow can be undone
- [ ] All undo operations can be redone
- [ ] Arrow history integration doesn't break existing functionality

---

## Step 10: Implement Auto-save for Arrows
### Task Description
- Save arrow data in the auto-save system
- Load arrow data when routine is restored

### Implementation Details
- Include arrow data in auto-save serialization
- Load arrow data from auto-save
- Ensure data integrity during save/load

### Test Cases
- [ ] Arrow data is saved during auto-save
- [ ] Arrow data is loaded when routine is restored
- [ ] Arrows persist after page refresh
- [ ] No data corruption occurs during save/load

---

## Step 11: Implement PDF Export for Arrows
### Task Description
- Include arrows in PDF export functionality
- Ensure arrows render correctly in PDF output

### Implementation Details
- Update PDF export logic to include arrows
- Ensure proper scaling and positioning in PDF
- Handle styling appropriately for print

### Test Cases
- [ ] Arrows appear in PDF export
- [ ] Arrow positions are accurate in PDF
- [ ] Arrow styling is preserved in PDF
- [ ] PDF export performance is not significantly impacted

---

## Step 12: Implement Propagation to Following Lines
### Task Description
- Ensure arrows propagate to following lines similar to position icons
- Maintain arrow relative positions when lines are added/copied

### Implementation Details
- Update propagation logic to handle arrows
- Copy arrows to new lines when appropriate
- Maintain relative positions during propagation

### Test Cases
- [ ] Arrows propagate to new lines when lines are added
- [ ] Arrows maintain relative positions when routine is modified
- [ ] Arrow propagation respects routine structure
- [ ] Propagated arrows can be independently modified

---

## Step 13: Implement Touch Dragging Support
### Task Description
- Add touch support for drawing and interacting with arrows
- Ensure proper functionality on mobile and touch devices

### Implementation Details
- Add touch event handlers for arrow creation
- Implement touch-based dragging for arrows
- Ensure responsive behavior on touch devices

### Test Cases
- [ ] Arrows can be drawn using touch interface
- [ ] Arrows can be dragged using touch
- [ ] Touch selection works for arrows
- [ ] Touch interactions are responsive and accurate

---

## Step 14: Additional Arrow Features
### Task Description
- Add advanced arrow features like styling options
- Add keyboard shortcuts for arrow manipulation
- Add context menu for arrow options

### Implementation Details
- Implement arrow styling controls
- Add keyboard shortcuts for arrow operations
- Create context menu for arrow manipulation

### Test Cases
- [ ] Arrow styling options work correctly
- [ ] Keyboard shortcuts function for arrow operations
- [ ] Context menu provides arrow manipulation options
- [ ] Additional features don't impact performance