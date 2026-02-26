import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// Supabase client provider
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

// Current user provider
final currentUserProvider = Provider<User?>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return supabase.auth.currentUser;
});

// Auth state provider
final authStateProvider = StreamProvider<User?>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return supabase.auth.onAuthStateChange.map((event) => event.session?.user);
});

// Auth methods provider
final authProvider = Provider<AuthMethods>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return AuthMethods(supabase);
});

class AuthMethods {
  final SupabaseClient _supabase;

  AuthMethods(this._supabase);

  Future<AuthResult> signInWithEmail(String email, String password) async {
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        return AuthResult(user: response.user);
      } else {
        return AuthResult(error: 'Login failed');
      }
    } on AuthException catch (e) {
      return AuthResult(error: e.message);
    } catch (e) {
      return AuthResult(error: 'An unexpected error occurred');
    }
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
}

class AuthResult {
  final User? user;
  final String? error;

  AuthResult({this.user, this.error});

  bool get isSuccess => user != null && error == null;
}
