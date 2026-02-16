# Specification

## Summary
**Goal:** Make user search functional so users can reliably find other users from the Friends page.

**Planned changes:**
- Add/confirm a backend user search API that accepts a text query and returns matching user profiles by case-insensitive match on username and user ID, excluding the caller and returning an empty list when no matches.
- Ensure the backend search method follows the same permission/access pattern as other profile operations and returns safe-to-display profile fields for search results.
- Update the Friends page search flow to call the backend search API using the current user-entered query (Enter key or Search button) via the existing React Query hook pattern.
- Fix any frontend hook/API mismatches (method names, queryKey/queryFn parameters, candid/type alignment) so results are not empty due to wiring issues, and add graceful failure behavior with an English error toast when the backend method is unavailable.
- Add/confirm UI states for loading and “No users found matching your search.” without requiring a page refresh.

**User-visible outcome:** Users can search for other users on the Friends page and see matching profiles (or a clear “No users found…” message), with responsive loading and safe error handling.
