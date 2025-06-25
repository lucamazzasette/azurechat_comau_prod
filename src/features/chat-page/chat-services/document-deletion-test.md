# Document Deletion Enhancement Test Guide

This document outlines how to test the enhanced document deletion functionality that preserves chat memory for remaining documents.

## What Was Fixed

**Previous Issue:**
- When deleting one document from a chat with multiple documents, ALL document content was removed from the Azure AI Search index
- This caused the chat to lose access to content from remaining documents
- Users would lose the ability to ask questions about documents that were still supposed to be available

**New Solution:**
- Selective document deletion: Only the specific document's content is removed from the search index
- Document context refresh: Remaining documents are verified and kept accessible
- Enhanced user feedback: Users are informed about how many documents remain accessible

## Key Changes Made

### 1. Enhanced Azure AI Search Operations (`azure-ai-search.ts`)
- Added `DeleteSpecificDocuments()` - removes only content from a specific document
- Added `ReIndexRemainingDocuments()` - verifies remaining documents are accessible
- Kept original `DeleteDocuments()` for full thread deletion

### 2. Updated Document Deletion Service (`chat-document-delete-service.ts`)
- Modified `SoftDeleteChatDocument()` to use selective deletion
- Integrated document context refresh after deletion
- Improved error handling and logging

### 3. New Document Refresh Service (`chat-document-refresh-service.ts`)
- `RefreshChatDocumentContext()` - verifies and refreshes document availability
- `VerifyDocumentContextIntegrity()` - checks for consistency between database and search index
- Provides detailed status information about document context

### 4. Enhanced UI Feedback (`document-item.tsx`)
- Improved deletion confirmation messages
- Shows count of remaining documents after deletion
- Better error handling and user feedback

## Testing Scenarios

### Scenario 1: Delete One Document from Multiple Documents
1. Upload 3 documents to a chat (e.g., doc1.pdf, doc2.pdf, doc3.pdf)
2. Ask questions about all documents to verify they're accessible
3. Delete doc1.pdf
4. Verify:
   - Success message shows "2 remaining documents"
   - You can still ask questions about doc2.pdf and doc3.pdf content
   - Search functionality works for remaining documents

### Scenario 2: Delete Last Document
1. Upload 1 document to a chat
2. Delete the document
3. Verify:
   - Success message shows "No documents remain in this chat"
   - Chat continues to work for regular conversation
   - No search index errors

### Scenario 3: Batch Document Deletion
1. Upload multiple documents
2. Delete several documents (but not all)
3. Verify remaining documents are still accessible

## Technical Verification

### Debug Logging
Enable debug mode by setting `DEBUG=true` in environment variables to see detailed logs:
- Document deletion process
- Search index operations
- Context refresh operations

### Database Verification
Check Cosmos DB to ensure:
- Deleted documents have `isDeleted: true`
- Remaining documents have `isDeleted: false`

### Search Index Verification
Verify Azure AI Search index:
- Only content from deleted documents is removed
- Content from remaining documents is preserved
- Search queries return appropriate results

## Expected Behavior

### Before Fix
```
Chat with docs A, B, C → Delete doc A → Chat loses access to docs B and C
```

### After Fix
```
Chat with docs A, B, C → Delete doc A → Chat retains access to docs B and C
```

## Error Handling

The solution includes robust error handling:
- If search index deletion fails, document is still marked as deleted in database
- If context refresh fails, deletion still succeeds with appropriate warnings
- Users receive clear feedback about any issues

## Performance Considerations

- Selective deletion is more efficient than full re-indexing
- Context refresh is lightweight and only verifies existing content
- No impact on chat performance for remaining documents

## Backward Compatibility

- All existing functionality remains unchanged
- Full thread deletion still works as before
- No breaking changes to existing APIs
