# VINVERSE Phase 2 API Test Plan

## Overview
This document outlines the testing strategy and endpoint coverage for the VINVERSE Phase 2 API. The provided Postman Collection and Environment files are designed to thoroughly test and validate all implemented features and business rules.

## Artifacts Generated
1. `VINVERSE_Phase2.postman_collection.json`: The complete test suite for Postman.
2. `VINVERSE_Local.postman_environment.json`: The environment variables configured for local testing.

## Execution Order
To ensure all tests run successfully, they should be executed sequentially, as many downstream requests rely on variables populated by earlier responses.

1. **AUTH**: (Generates `accessToken`, `refreshToken`, `adminAccessToken`, `adminRefreshToken`)
2. **USERS**: Requires `accessToken`
3. **ADDRESSES**: Requires `accessToken` (Generates `addressId`)
4. **PRODUCTS**: Requires `adminAccessToken` (Generates `productId`, `apparelProductId`, `bookProductId`, `bookId`, `authorId`)
5. **BOOKS**: Requires `bookId` and `adminAccessToken`
6. **AUTHORS**: Requires `authorId` and `adminAccessToken`
7. **INQUIRIES**: Generates `inquiryId`
8. **SETTINGS**: Requires `adminAccessToken`
9. **HEALTH**: Unauthenticated
10. **NEGATIVE TESTS**: Tests invalid cases using previously generated data

## Endpoint Coverage Table

| Module | Endpoint | Method | Covered | Tests Included |
|---|---|---|---|---|
| **AUTH** | `/auth/register` | POST | Yes | Status, Success, ID Capture |
| **AUTH** | `/auth/login` | POST | Yes | Status, Success, Admin Token Capture |
| **AUTH** | `/auth/refresh` | POST | Yes | Status, Success, Token Refresh |
| **AUTH** | `/auth/me` | GET | Yes | Status, Success, Email Field Check |
| **AUTH** | `/auth/logout` | POST | Yes | Status, Success |
| **USERS** | `/users/me` | GET | Yes | Status, Success |
| **USERS** | `/users/me` | PATCH | Yes | Status, Success, Name Update Check |
| **USERS** | `/users/password` | PATCH | Yes | Status, Success |
| **ADDRESSES** | `/addresses` | POST | Yes | Status, Success, ID Capture |
| **ADDRESSES** | `/addresses` | GET | Yes | Status, Success, Array Check |
| **ADDRESSES** | `/addresses/:id` | PATCH | Yes | Status, Success |
| **ADDRESSES** | `/addresses/:id` | DELETE | Yes | Status, Success |
| **PRODUCTS** | `/products` | POST (Apparel) | Yes | Status, Success, Size Array Validation |
| **PRODUCTS** | `/products` | POST (Merch) | Yes | Status, Success, ID Capture |
| **PRODUCTS** | `/products` | POST (Book) | Yes | Status, Success, Book & Author Creation Check |
| **PRODUCTS** | `/products` | GET | Yes | Status, Success |
| **PRODUCTS** | `/products/:id` | GET | Yes | Status, Success |
| **PRODUCTS** | `/products/:id` | PATCH | Yes | Status, Success |
| **PRODUCTS** | `/products/:id` | DELETE | Yes | Status, Success |
| **BOOKS** | `/books` | GET | Yes | Status, Success |
| **BOOKS** | `/books/:id` | GET | Yes | Status, Success |
| **BOOKS** | `/books/:id` | PATCH | Yes | Status, Success |
| **BOOKS** | `/books/:id` | DELETE | Yes | Status, Success |
| **AUTHORS** | `/authors` | GET | Yes | Status, Success |
| **AUTHORS** | `/authors/:id` | GET | Yes | Status, Success |
| **AUTHORS** | `/authors/:id` | PATCH | Yes | Status, Success |
| **AUTHORS** | `/authors/:id` | DELETE | Yes | Status, Success |
| **INQUIRIES** | `/inquiries` | POST | Yes | Status, Success, ID Capture |
| **INQUIRIES** | `/inquiries` | GET | Yes | Status, Success |
| **INQUIRIES** | `/inquiries/:id` | GET | Yes | Status, Success |
| **INQUIRIES** | `/inquiries/:id` | PATCH | Yes | Status, Success |
| **SETTINGS** | `/settings` | GET | Yes | Status, Success |
| **SETTINGS** | `/settings` | PATCH | Yes | Status, Success, Persistence Check |
| **HEALTH** | `/health` | GET | Yes | Status, Success |

## Test Coverage Percentage
- **Implemented Endpoints**: 32/32
- **Test Coverage**: 100%
- **Negative Testing**: Included (4 specific negative tests, representing Authentication, Authorization, Validation, and ID errors).

## Verification of Business Rules
1. **Book creation creates Product**: Tested in Product (Book) POST. Checks that `book` property exists in response.
2. **Book creation creates Author**: Tested in Product (Book) POST. Checks that `author` property exists within `book`.
3. **Apparel sizes persist**: Tested in Product (Apparel) POST. Checks that the returned sizes array length equals 2.
4. **Settings update persists**: Tested in Settings PATCH. Checks that the response data reflects the new store name.
5. **Existing Author is reused**: While visually validated during collection runs by checking database state, it is difficult to test completely automatically in a single pass without querying for duplicates.

## Known Limitations
1. Postman environments only reset dynamically if coded to do so. Running the suite multiple times may leave stale IDs in the environment variables if a run fails mid-way.
2. The `Delete Author` endpoint might return a `409` if the author still has associated books. The test specifically anticipates either `200` or `409` to prevent false test failures.
3. Random unique data (like emails) are hardcoded. Successive runs without clearing the database might result in `409 Conflict` (Email already exists) on the registration step unless the email is randomized or the DB is reset. (Consider resetting DB using `npm run seed` or altering the test email before runs).
