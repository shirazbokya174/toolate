import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/supabase_provider.dart';
import '../providers/branch_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final branchAsync = ref.watch(assignedBranchProvider);
    final orgAsync = ref.watch(organizationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('TooLate POS'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final auth = ref.read(authProvider);
              await auth.signOut();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: user == null
          ? const Center(child: Text('Not authenticated'))
          : RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(assignedBranchProvider);
                ref.invalidate(organizationProvider);
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Welcome Card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                  child: Text(
                                    user.email?.substring(0, 1).toUpperCase() ?? 'U',
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Welcome!',
                                        style: Theme.of(context).textTheme.titleMedium,
                                      ),
                                      Text(
                                        user.email ?? 'No email',
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Organization Info
                    Text(
                      'Organization',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    orgAsync.when(
                      data: (org) {
                        if (org == null) {
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                children: [
                                  const Icon(Icons.warning_amber, size: 48, color: Colors.orange),
                                  const SizedBox(height: 8),
                                  const Text('No organization found'),
                                  const SizedBox(height: 4),
                                  Text(
                                    'You are not assigned to any branch yet.',
                                    style: Theme.of(context).textTheme.bodySmall,
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        return Card(
                          child: ListTile(
                            leading: const Icon(Icons.business),
                            title: Text(org.name),
                            subtitle: Text(org.type?.replaceAll('_', ' ') ?? 'Organization'),
                          ),
                        );
                      },
                      loading: () => const Card(
                        child: ListTile(
                          leading: CircularProgressIndicator(),
                          title: Text('Loading...'),
                        ),
                      ),
                      error: (e, _) => Card(
                        child: ListTile(
                          leading: const Icon(Icons.error, color: Colors.red),
                          title: Text('Error: $e'),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Branch Info
                    Text(
                      'Your Branch',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    branchAsync.when(
                      data: (branch) {
                        if (branch == null) {
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                children: [
                                  const Icon(
                                    Icons.store_outlined,
                                    size: 48,
                                    color: Colors.grey,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No Branch Assigned',
                                    style: Theme.of(context).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Contact your organization admin to get access to a branch.',
                                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: Colors.grey,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        return Card(
                          child: Column(
                            children: [
                              ListTile(
                                leading: Icon(
                                  Icons.store,
                                  color: branch.isActive ? Colors.green : Colors.grey,
                                ),
                                title: Text(branch.name),
                                subtitle: Text('Code: ${branch.code}'),
                                trailing: branch.isActive
                                    ? const Chip(label: Text('Active'))
                                    : const Chip(
                                        label: Text('Inactive'),
                                        backgroundColor: Colors.grey,
                                      ),
                              ),
                              if (branch.address != null && branch.address!.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.location_on, size: 16, color: Colors.grey),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          branch.address!,
                                          style: Theme.of(context).textTheme.bodySmall,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        );
                      },
                      loading: () => const Card(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                      ),
                      error: (e, _) => Card(
                        child: ListTile(
                          leading: const Icon(Icons.error, color: Colors.red),
                          title: Text('Error: $e'),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Quick Actions
                    Text(
                      'Quick Actions',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    branchAsync.when(
                      data: (branch) {
                        if (branch == null || !branch.isActive) {
                          return const SizedBox.shrink();
                        }
                        return GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          childAspectRatio: 1.5,
                          children: [
                            _QuickActionCard(
                              icon: Icons.inventory_2,
                              label: 'Inventory',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Inventory coming soon')),
                                );
                              },
                            ),
                            _QuickActionCard(
                              icon: Icons.qr_code_scanner,
                              label: 'Scan Item',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Scanner coming soon')),
                                );
                              },
                            ),
                            _QuickActionCard(
                              icon: Icons.receipt_long,
                              label: 'Transactions',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Transactions coming soon')),
                                );
                              },
                            ),
                            _QuickActionCard(
                              icon: Icons.analytics,
                              label: 'Reports',
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Reports coming soon')),
                                );
                              },
                            ),
                          ],
                        );
                      },
                      loading: () => const SizedBox.shrink(),
                      error: (e, st) => const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 28),
              const SizedBox(height: 4),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}
