package com.staysafe.repo;

import com.staysafe.model.Booking;
import com.staysafe.model.Payment;
import com.staysafe.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    /** Row lock so the checkout-verify call and the webhook can never create two bookings for one payment. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Payment> findWithLockByRazorpayOrderId(String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Payment> findWithLockByRazorpayPaymentId(String paymentId);

    Optional<Payment> findByBooking(Booking booking);
    List<Payment> findByUserOrderByCreatedAtDesc(User user);
    List<Payment> findTop200ByOrderByCreatedAtDesc();
    List<Payment> findTop200ByStatusOrderByCreatedAtDesc(String status);
}
