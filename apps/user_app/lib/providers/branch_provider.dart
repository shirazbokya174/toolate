import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'supabase_provider.dart';

// Branch with organization info
class BranchWithOrg {
  final String branchId;
  final String branchName;
  final String branchCode;
  final String? branchAddress;
  final String orgId;
  final String orgName;
  final String orgSlug;

  BranchWithOrg({
    required this.branchId,
    required this.branchName,
    required this.branchCode,
    this.branchAddress,
    required this.orgId,
    required this.orgName,
    required this.orgSlug,
  });

  String get displayName => '$orgName - $branchName';
}

// Fetch all active branches with organization info
final allBranchesProvider = FutureProvider<List<BranchWithOrg>>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);

  // Query active branches with their organizations
  final result = await supabase
      .from('branches')
      .select('''
        id,
        name,
        code,
        address,
        organization_id,
        organizations!inner(
          id,
          name,
          slug
        )
      ''')
      .eq('is_active', true)
      .order('name');

  if (result.isEmpty) return [];

  return result.map((row) {
    final org = row['organizations'] as Map<String, dynamic>;
    return BranchWithOrg(
      branchId: row['id'] as String,
      branchName: row['name'] as String,
      branchCode: row['code'] as String,
      branchAddress: row['address'] as String?,
      orgId: org['id'] as String,
      orgName: org['name'] as String,
      orgSlug: org['slug'] as String,
    );
  }).toList();
});

// Selected branch state notifier
class SelectedBranchNotifier extends Notifier<BranchWithOrg?> {
  @override
  BranchWithOrg? build() => null;

  void select(BranchWithOrg? branch) {
    state = branch;
  }
}

final selectedBranchProvider = NotifierProvider<SelectedBranchNotifier, BranchWithOrg?>(
  SelectedBranchNotifier.new,
);
