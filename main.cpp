// C++ algorithm reference for the website demonstration.
#include <algorithm>
#include <functional>
#include <limits>
#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

struct Road {
    std::string id, from, to;
    int distanceKm = 1;
    bool open = true;
};

std::vector<Road> sampleRoads() {
    return {
        {"R1", "Himgaun", "Pinegaon", 4}, {"R2", "Pinegaon", "Valley End", 3},
        {"R3", "Pinegaon", "Devdar", 6}, {"R8", "West Pass", "Devdar", 5},
        {"R4", "Devdar", "Ridgepur", 2}, {"R5", "Ridgepur", "Devgarh Depot", 3},
        {"R6", "Devdar", "Meghavan", 2}, {"R7", "Meghavan", "Devgarh Depot", 15},
        {"R9", "Pinegaon", "Meghavan", 15}, {"R10", "Himgaun", "Devdar", 12},
        {"R11", "Valley End", "Meghavan", 2}
    };
}

struct RouteSearch {
    bool found = false;
    int distanceKm = 0;
    std::vector<std::string> towns, roadIds, steps;
};

int routeDistance(const std::vector<std::string>& roadIds, const std::vector<Road>& roads) {
    int sum = 0;
    for (const std::string& id : roadIds)
        for (const Road& road : roads) if (road.id == id) { sum += road.distanceKm; break; }
    return sum;
}

// DFS follows one road branch, then backtracks when that branch fails.
bool dfsVisit(const std::string& town, const std::string& destination,
              const std::vector<Road>& roads, std::unordered_set<std::string>& visited,
              RouteSearch& result) {
    visited.insert(town);
    result.towns.push_back(town);
    if (town == destination) { result.found = true; return true; }
    for (const Road& road : roads) {
        if (!road.open) continue;
        std::string next;
        if (road.from == town) next = road.to;
        else if (road.to == town) next = road.from;
        else continue;
        if (visited.count(next)) continue;
        result.steps.push_back("Explore " + town + " to " + next + " using " + road.id);
        result.roadIds.push_back(road.id);
        if (dfsVisit(next, destination, roads, visited, result)) return true;
        result.roadIds.pop_back();
        result.steps.push_back("Backtrack to " + town);
    }
    result.towns.pop_back();
    return false;
}

RouteSearch findRouteDFS(const std::string& start, const std::string& destination,
                         const std::vector<Road>& roads) {
    RouteSearch result;
    std::unordered_set<std::string> visited;
    dfsVisit(start, destination, roads, visited, result);
    if (!result.found) result.towns.clear();
    else result.distanceKm = routeDistance(result.roadIds, roads);
    return result;
}

// BFS uses a queue. For an unweighted graph, its route has the fewest road segments.
RouteSearch findRouteBFS(const std::string& start, const std::string& destination,
                         const std::vector<Road>& roads) {
    RouteSearch result;
    std::queue<std::string> pending;
    std::unordered_set<std::string> visited{start};
    std::unordered_map<std::string, std::pair<std::string, std::string>> previous;
    pending.push(start);
    while (!pending.empty() && !visited.count(destination)) {
        const std::string current = pending.front(); pending.pop();
        for (const Road& road : roads) {
            if (!road.open) continue;
            std::string next;
            if (road.from == current) next = road.to;
            else if (road.to == current) next = road.from;
            else continue;
            if (visited.insert(next).second) {
                previous[next] = {current, road.id};
                pending.push(next);
            }
        }
    }
    if (start == destination) { result.found = true; result.towns = {start}; return result; }
    if (!visited.count(destination)) return result;
    std::string current = destination;
    result.towns.push_back(current);
    while (current != start) {
        const auto step = previous.at(current);
        result.roadIds.push_back(step.second); current = step.first; result.towns.push_back(current);
    }
    std::reverse(result.towns.begin(), result.towns.end());
    std::reverse(result.roadIds.begin(), result.roadIds.end());
    result.found = true;
    result.distanceKm = routeDistance(result.roadIds, roads);
    return result;
}

// Dijkstra uses a min-priority queue to find the route with the lowest total distance.
RouteSearch findRouteDijkstra(const std::string& start, const std::string& destination,
                              const std::vector<Road>& roads) {
    using QueueItem = std::pair<int, std::string>;
    std::priority_queue<QueueItem, std::vector<QueueItem>, std::greater<QueueItem>> pending;
    std::unordered_map<std::string, int> distance;
    std::unordered_map<std::string, std::pair<std::string, std::string>> previous;
    distance[start] = 0;
    pending.push({0, start});
    while (!pending.empty()) {
        const auto [currentDistance, current] = pending.top(); pending.pop();
        if (distance[current] != currentDistance) continue;
        if (current == destination) break;
        for (const Road& road : roads) {
            if (!road.open) continue;
            std::string next;
            if (road.from == current) next = road.to;
            else if (road.to == current) next = road.from;
            else continue;
            const int candidate = currentDistance + road.distanceKm;
            if (distance.count(next) && candidate >= distance[next]) continue;
            distance[next] = candidate;
            previous[next] = {current, road.id};
            pending.push({candidate, next});
        }
    }
    RouteSearch result;
    if (start == destination) { result.found = true; result.towns = {start}; return result; }
    if (!distance.count(destination)) return result;
    std::string current = destination;
    result.towns.push_back(current);
    while (current != start) {
        const auto step = previous.at(current);
        result.roadIds.push_back(step.second); current = step.first; result.towns.push_back(current);
    }
    std::reverse(result.towns.begin(), result.towns.end());
    std::reverse(result.roadIds.begin(), result.roadIds.end());
    result.found = true; result.distanceKm = distance[destination];
    return result;
}

struct SplitCheck { bool valid = false; int sum = 0; };
SplitCheck validateShipmentSplit(int total, const std::vector<int>& vehicleLoads) {
    SplitCheck result;
    if (total <= 0 || vehicleLoads.empty()) return result;
    for (int amount : vehicleLoads) {
        if (amount <= 0) return result;
        result.sum += amount;
    }
    result.valid = result.sum == total;
    return result;
}

struct VehicleLoad {
    std::string id, vehicle, receiptReference;
    int planned = 0, received = 0;
    bool hasReceipt = false;
};
struct Shipment { std::string id, supply, unit; int total = 0; std::vector<VehicleLoad> loads; };

bool recordReceivedQuantity(Shipment& shipment, const std::string& loadId,
                            int received, const std::string& reference) {
    if (received < 0 || reference.empty()) return false;
    for (VehicleLoad& load : shipment.loads) {
        if (load.id == loadId) {
            load.received = received; load.hasReceipt = true; load.receiptReference = reference;
            return true;
        }
    }
    return false;
}

struct DeliveryReport { int planned = 0, received = 0, missingOrShort = 0; std::string status = "Complete"; };
DeliveryReport makeDeliveryReport(const Shipment& shipment) {
    DeliveryReport report;
    bool anyReceipt = false;
    for (const VehicleLoad& load : shipment.loads) {
        report.planned += load.planned;
        if (!load.hasReceipt) { report.missingOrShort += load.planned; continue; }
        anyReceipt = true; report.received += load.received;
        if (load.received < load.planned) report.missingOrShort += load.planned - load.received;
    }
    if (report.missingOrShort > 0) report.status = anyReceipt ? "Short / missing" : "Missing";
    else if (report.received > report.planned) report.status = "Excess";
    return report;
}
