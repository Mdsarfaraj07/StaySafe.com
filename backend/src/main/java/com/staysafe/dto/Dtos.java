package com.staysafe.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public final class Dtos {
    private Dtos() {}

    // ---- auth ----
    public record RegisterRequest(@NotBlank String name, @NotBlank @Email String email,
                                  @NotBlank @Size(min = 8) String password, String phone, String role) {}
    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record UpdateProfileRequest(String name, String phone) {}
    public record UserDto(Long id, String name, String email, String phone, String role, boolean enabled, String joined,
                          String avatarUrl) {}
    public record AuthResponse(String token, UserDto user) {}
    public record OtpChallengeResponse(String challengeId, String email, String message) {}
    public record OtpVerifyRequest(@NotBlank String challengeId, @NotBlank @Size(min=6,max=6) String otp) {}
    public record OtpResendRequest(@NotBlank String challengeId) {}
    public record ForgotPasswordRequest(@NotBlank @Email String email) {}
    public record ResetPasswordRequest(@NotBlank String challengeId, @NotBlank @Size(min=6,max=6) String otp,
                                       @NotBlank @Size(min=8,max=100) String newPassword) {}

    // ---- property ----
    public record PropertyRequest(@NotBlank String name, @NotBlank String type, @NotBlank String location,
                                  Integer price, Integer deposit, String description,
                                  List<String> amenities, List<String> images,
                                  @NotNull Double latitude, @NotNull Double longitude, String address,
                                  String genderPolicy, String foodPolicy, String tenantType,
                                  Boolean smokingAllowed, Boolean drinkingAllowed, Boolean petsAllowed, Boolean visitorsAllowed,
                                  @NotEmpty List<@Valid RoomRequest> rooms) {}
    public record PropertyDto(Long id, String name, String type, String location, int price, double rating,
                              int reviewsCount, boolean verified, String image, List<String> images,
                              List<String> amenities, String description, String status, int bookingsCount,
                              String owner, String ownerPhone, int deposit,
                              Double latitude, Double longitude, String address,
                              String genderPolicy, String foodPolicy, String tenantType, boolean smokingAllowed,
                              boolean drinkingAllowed, boolean petsAllowed, boolean visitorsAllowed,
                              List<RoomDto> rooms, int bedsAvailable) {}

    // ---- booking ----
    public record BookingRequest(@NotNull Long propertyId, @NotNull LocalDate checkIn, @NotNull LocalDate checkOut,
                                 String guests, String paymentMethod) {}
    public record BookingDto(String id, Long dbId, Long propertyId, String propertyName, String location,
                             LocalDate checkIn, LocalDate checkOut, String guests, int amount, String status,
                             String image, String paymentMethod, String paymentRef,
                             String customerName, String customerEmail, String customerPhone,
                             String roomLabel, int occupancy) {}

    // ---- search / details ----
    public record UserDetailDto(UserDto user, int bookingsCount, long totalAmount, int propertiesCount,
                                List<BookingDto> bookings, List<PropertyDto> properties, KycDto kyc) {}
    public record CustomerDto(Long id, String name, String email, String phone, int totalBookings, int activeBookings,
                              long totalPaid, String lastBooking, List<String> properties, List<BookingDto> bookings) {}

    // ---- KYC ----
    public record DigiLockerStartRequest(@NotNull Boolean consent) {}
    public record CkycLookupRequest(@NotBlank String idType, @NotBlank String idNumber, @NotNull LocalDate dob, boolean consent) {}
    public record ManualKycRequest(@NotBlank String idType, @NotBlank String idNumber, @NotBlank String fullName,
                                   @NotNull LocalDate dob, @NotBlank String address, boolean consent) {}
    public record CkycLookupResponse(boolean found, String ckycNumber, String fullName, LocalDate dob, String gender,
                                     String address, String idMasked, String message) {}
    public record KycDto(Long id, String status, String source, String idType, String idMasked, String ckycNumber,
                         String fullName, LocalDate dob, String address, String remarks, String submittedAt,
                         Long ownerId, String ownerName, String ownerEmail) {}
    public record KycReview(String remarks) {}

    // ---- payments (Razorpay) ----
    public record OrderRequest(@NotNull Long propertyId, @NotNull Long roomId, @NotNull LocalDate checkIn, @NotNull LocalDate checkOut, String guests) {}
    public record OrderResponse(String orderId, long amount, String currency, String keyId, Long paymentId,
                                String propertyName, String description) {}
    public record VerifyRequest(@NotBlank String razorpayOrderId, @NotBlank String razorpayPaymentId,
                                @NotBlank String razorpaySignature) {}
    public record RefundRequest(Integer amount) {}
    public record PaymentDto(Long id, String orderId, String paymentId, String status, String method, int amount,
                             String currency, int refundedAmount, String refundStatus, String disputeStatus,
                             String failureReason, String customerName, String customerEmail, String propertyName,
                             String bookingCode, String createdAt, String capturedAt) {}
    public record WebhookEventDto(Long id, String eventId, String eventType, String status, String error, String receivedAt) {}

    // ---- sharing: rooms, residents, roommates, tenant profile ----
    public record RoomRequest(Long id, @NotBlank String label, @Min(1) @Max(6) int occupancy, @Min(1) int pricePerBed,
                              @Min(1) int totalBeds, @Min(0) int availableBeds, boolean acRoom, boolean attachedBathroom) {}
    public record RoomDto(Long id, String label, int occupancy, int pricePerBed, int totalBeds, int availableBeds,
                          boolean acRoom, boolean attachedBathroom) {}
    public record ResidentRequest(Long roomId, @NotBlank String name, @NotBlank String gender, @Min(16) @Max(90) int age,
                                  @NotBlank String occupation, String organization, @NotBlank String foodPreference,
                                  boolean smokes, boolean drinks, String sleepSchedule, String bio, LocalDate moveInDate,
                                  boolean consent) {}
    public record ResidentDto(Long id, Long roomId, String roomLabel, String name, String gender, int age, String occupation,
                              String organization, String foodPreference, boolean smokes, boolean drinks,
                              String sleepSchedule, String bio, LocalDate moveInDate) {}
    public record RoommateDto(String source, String name, String gender, String ageGroup, String occupation,
                              String organization, String foodPreference, boolean smokes, boolean drinks,
                              String sleepSchedule, String languages, String bio, String roomLabel, LocalDate moveIn,
                              String avatarUrl) {}
    public record TenantProfileRequest(String gender, LocalDate dob, String occupation, String organization,
                                       String foodPreference, boolean smokes, boolean drinks, String sleepSchedule,
                                       String languages, String bio, Boolean shareWithRoommates) {}
    public record TenantProfileDto(String gender, LocalDate dob, Integer age, String occupation, String organization,
                                   String foodPreference, boolean smokes, boolean drinks, String sleepSchedule,
                                   String languages, String bio, boolean shareWithRoommates, boolean complete) {}
    public record EligibilityDto(boolean eligible, List<String> reasons) {}

    // ---- support ----
    public record TicketRequest(@NotBlank String subject, String message) {}
    public record TicketUpdate(String response, String status) {}
    public record TicketDto(String id, Long dbId, String subject, String message, String status,
                            String response, String customerName, String customerEmail, String date) {}

    // ---- notifications / reviews ----
    public record NotificationDto(Long id, String title, String message, String type, boolean unread, String time,
                                  String refType, Long refId) {}
    public record ReviewRequest(@Min(1) @Max(5) int rating, String comment) {}
    public record ReviewDto(Long id, String userName, int rating, String comment, String date) {}
}
