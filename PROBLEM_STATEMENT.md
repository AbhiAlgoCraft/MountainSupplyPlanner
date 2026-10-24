# Mountain Supply Route and Delivery Demo

Create a beginner-friendly website using a fictional network of mountain towns. The website demonstrates these four tasks:

1. **Find routes:** choose a start and destination, block or reopen sample roads, and compare DFS, BFS, and Dijkstra route results on a map. Each fictional road has a sample distance.
2. **Split shipments:** divide a supply quantity among vehicle loads. Accept the shipment only when the amounts add up to the total and an open route exists.
3. **Record receipts:** enter the quantity received for an individual vehicle load using its load ID.
4. **Report delivery gaps:** compare planned and received quantities and show missing or short deliveries.

All town names and roads are invented for a classroom demonstration. The project is not a real map or navigation tool.

## DSA Concepts in C++

- **Graph:** towns are vertices and roads are edges.
- **Depth-first search (DFS):** explore connected towns and backtrack when a route branch fails.
- **Breadth-first search (BFS):** use a queue to find a route with the fewest road segments.
- **Dijkstra’s algorithm:** use a min-priority queue to find the lowest-distance route when road lengths differ.
- **Vector:** store roads, visited towns, vehicle loads, and route steps.
- **Structures:** keep related shipment and vehicle-load information together.
- **Summation and validation:** check shipment splits and calculate missing quantities.

## Explain it simply

“The program searches a network of towns for a route. A shipment is divided into vehicle loads. When each vehicle arrives, I record its received amount, and the report compares it with the planned amount to find shortages.”
