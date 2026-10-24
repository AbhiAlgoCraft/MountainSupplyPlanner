# Mountain Supply Planner

A small browser-based project for exploring route planning and delivery tracking. It includes an interactive map of sample mountain towns, shipment splitting, vehicle receipt entry, and a delivery shortage report.

> **About the map data:** The town network and road distances in this project are illustrative sample data. They are for demonstrating algorithms and are not verified locations, road connections, or navigation directions.

## Open the project

No server, account, or package installation is needed.

1. Download or clone this repository.
2. Open `index.html` in a modern web browser.
3. To restore the original example data later, choose **Reset data** in the page header.

On Windows, you can also double-click `run.bat` to open the page in your default browser.

## Use the website

### Find a route

1. Open **Route map**.
2. Choose a starting town, destination, and route method.
3. Select **Find route**. The map highlights the selected route and shows its road count and sample distance.
4. Click a road control to block or reopen that road, then compare the results.

The three methods answer slightly different questions:

| Method | What it shows | Main data structure |
| --- | --- | --- |
| DFS (Depth-First Search) | Finds a route by exploring one branch at a time. Its full search tree can be played, stepped through, and restarted. | Recursion and a visited set |
| BFS (Breadth-First Search) | Finds a route with the fewest road segments when each road counts as one step. | Queue |
| Dijkstra | Finds the route with the lowest sum of sample road distances. | Min-priority queue |

### Create a shipment

1. Open **Create shipment**.
2. Choose the origin and destination, enter a supply name and total, then enter vehicle amounts separated by commas (for example, `10, 8, 6`).
3. Choose **Simulate loading** to see the vehicle loads visualized.
4. Choose **Create shipment**. The loads must be positive whole numbers that add up to the shipment total, and there must be an open route.

### Record vehicle receipts and review shortages

1. Open **Vehicle loads & report**.
2. Choose **Record receipt** beside the vehicle load that arrived.
3. Enter the received quantity and a receipt reference, then save.
4. Review the report to see complete, short, or missing quantities for each load.

The page starts with an example shipment so the receipt and reporting features can be explored immediately.

## Saving and resetting data

The page saves road changes, shipments, and receipts in the browser's local storage on the current device. This is a local demonstration: it does not send data to a server or share data between devices. Use **Reset data** to restore the original example state.

## C++ algorithms

`main.cpp` contains readable C++ reference implementations for DFS, BFS, Dijkstra, shipment split validation, recording a vehicle receipt, and calculating delivery gaps. It is included to make the data structures and algorithms easy to inspect and explain.

The website itself runs in the browser using HTML, CSS, and JavaScript. Browsers do not run this C++ file directly; the interactive page uses matching JavaScript logic. The C++ file is a collection of functions and data structures, not a standalone console program, so it does not have a `main()` entry point.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout and feature sections |
| `styles.css` | Page appearance and responsive layout |
| `app.js` | Route, shipment, receipt, report, and simulation behavior |
| `main.cpp` | C++ reference algorithms and data structures |
| `PROBLEM_STATEMENT.md` | Short project scope and algorithm summary |
| `run.bat` | Windows shortcut for opening the website |
| `.gitignore` | Keeps the local compiled executable out of Git |


