import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'supabase_provider.dart';

// Branch model
class Branch {
  final String id;
  final String organizationId;
  final String name;
  final String code;
  final String? address;
  final bool isActive;

  Branch({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.code,
    this.address,
    required this.isActive,
  });

  factory Branch.fromMap(Map<String, dynamic> map) {
    return Branch(
      id: map['id'] as String,
      organizationId: map['organization_id'] as String,
      name: map['name'] as String,
      code: map['code'] as String,
      address: map['address'] as String?,
      isActive: map['is_active'] as bool? ?? false,
    );
  }
}

// Organization model
class Organization {
  final String id;
  final String name;
  final String slug;
  final String? type;

  Organization({
    required this.id,
    required this.name,
    required this.slug,
    this.type,
  });

  factory Organization.fromMap(Map<String, dynamic> map) {
    return Organization(
      id: map['id'] as String,
      name: map['name'] as String,
      slug: map['slug'] as String,
      type: map['type'] as String?,
    );
  }
}

// Fetch assigned branch for current user
final assignedBranchProvider = FutureProvider<Branch?>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);
  final user = ref.watch(currentUserProvider);

  if (user == null) return null;

  // Query branch_members to find user's branch
  final branchMemberResult = await supabase
      .from('branch_members')
      .select('branch_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

  if (branchMemberResult == null) {
    // User might not be assigned to any branch yet
    return null;
  }

  final branchId = branchMemberResult['branch_id'] as String?;

  if (branchId == null) return null;

  // Get branch details
  final branchResult = await supabase
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single();

  return Branch.fromMap(branchResult);
});

// Fetch organization details
final organizationProvider = FutureProvider<Organization?>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);
  final branch = await ref.watch(assignedBranchProvider.future);

  if (branch == null) return null;

  final orgResult = await supabase
      .from('organizations')
      .select('id, name, slug, type')
      .eq('id', branch.organizationId)
      .single();

  return Organization.fromMap(orgResult);
});
