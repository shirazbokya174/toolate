import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../providers/supabase_provider.dart';
import '../providers/branch_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final MapController _mapController = MapController();
  
  // Default center (can be updated based on user location)
  static const LatLng _defaultCenter = LatLng(37.7749, -122.4194); // San Francisco

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final branchesAsync = ref.watch(allBranchesProvider);
    final selectedBranch = ref.watch(selectedBranchProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('TooLate'),
        centerTitle: true,
        actions: [
          if (user != null)
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () async {
                final auth = ref.read(authProvider);
                await auth.signOut();
              },
            ),
        ],
      ),
      body: Column(
        children: [
          // Map
          Expanded(
            flex: 2,
            child: branchesAsync.when(
              data: (branches) {
                // Create markers for each branch
                final markers = branches.map((branch) {
                  // For now, use a default location since we don't have lat/lng in the DB
                  // In a real app, you'd add lat/lng columns to the branches table
                  final isSelected = selectedBranch?.branchId == branch.branchId;
                  return Marker(
                    point: _defaultCenter, // Placeholder - would come from DB
                    width: isSelected ? 50 : 40,
                    height: isSelected ? 50 : 40,
                    child: GestureDetector(
                      onTap: () {
                        ref.read(selectedBranchProvider.notifier).select(branch);
                      },
                      child: Icon(
                        Icons.store,
                        color: isSelected 
                            ? Theme.of(context).colorScheme.primary 
                            : Colors.green,
                        size: isSelected ? 50 : 40,
                      ),
                    ),
                  );
                }).toList();

                return FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _defaultCenter,
                    initialZoom: 12,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.toolate.user_app',
                    ),
                    MarkerLayer(markers: markers),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error, size: 48, color: Colors.red),
                    const SizedBox(height: 8),
                    Text('Error loading branches: $e'),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: () => ref.invalidate(allBranchesProvider),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Branch List
          Expanded(
            flex: 1,
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(
                          Icons.store,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Nearby Branches',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: branchesAsync.when(
                      data: (branches) {
                        if (branches.isEmpty) {
                          return const Center(
                            child: Text('No active branches nearby'),
                          );
                        }

                        return ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: branches.length,
                          itemBuilder: (context, index) {
                            final branch = branches[index];
                            final isSelected = selectedBranch?.branchId == branch.branchId;

                            return Card(
                              color: isSelected 
                                  ? Theme.of(context).colorScheme.primaryContainer 
                                  : null,
                              child: ListTile(
                                leading: Icon(
                                  Icons.store,
                                  color: isSelected 
                                      ? Theme.of(context).colorScheme.primary 
                                      : Colors.green,
                                ),
                                title: Text(branch.branchName),
                                subtitle: Text(
                                  branch.branchAddress ?? branch.orgName,
                                ),
                                trailing: const Icon(Icons.chevron_right),
                                onTap: () {
                                  ref.read(selectedBranchProvider.notifier).select(branch);
                                  // Pan map to branch (would need lat/lng in real implementation)
                                  _mapController.move(_defaultCenter, 12);
                                },
                              ),
                            );
                          },
                        );
                      },
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (e, _) => Center(child: Text('Error: $e')),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Center on user location (would need geolocator in real implementation)
          _mapController.move(_defaultCenter, 12);
        },
        child: const Icon(Icons.my_location),
      ),
    );
  }
}
