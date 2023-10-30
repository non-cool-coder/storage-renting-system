import crypto from "crypto";
import { nanoid } from "nanoid";
import { razorpayKeySecret } from "../../common/constants";
import { database } from "../../common/firebase";
import l from "../../common.logger";
import razorpayInstance from "../../common/razorpay";

/**
 * Service for handling bookings and payment verification.
 */
class BookingService {
  /** @type {firebase.firestore.CollectionReference} */
  bookingCollectionRef = database.collection("bookings");

  /** @type {firebase.firestore.CollectionReference} */
  storageCollectionRef = database.collection("storages");

  /**
   * Verifies a payment for a booking.
   *
   * @param {string} razorpayPaymentId - The payment ID from Razorpay.
   * @param {string} razorpayOrderId - The order ID from Razorpay.
   * @param {string} razorpaySignature - The payment signature from Razorpay.
   * @param {string} bookingId - The unique booking ID.
   * @returns {Promise<{ message: string }>} An object containing the result of the payment verification.
   * @throws {Object} If the payment verification fails or the order is not found.
   */
  async verifyBooking(razorpayPaymentId, razorpayOrderId, razorpaySignature, bookingId) {
    try {
      const booking = await this.getBookingDocument(bookingId);
      this.validateBooking(booking);
      const paymentOrderId = this.getPaymentOrderId(razorpayOrderId, razorpayPaymentId);
      this.verifyPayment(booking, paymentOrderId, razorpaySignature);
      this.updateBookingPaymentStatus(booking);
      return { message: "Payment successful" };
    } catch (err) {
      l.error("[BOOKING: VERIFY BOOKING]", err);
      throw err;
    }
  }

  /**
   * Creates a booking for a user.
   *
   * @param {string} userId - The unique user ID.
   * @param {string} storageId - The unique storage facility ID.
   * @param {number} boxes - The number of boxes to be booked.
   * @param {number} amount - The booking amount.
   * @param {string} storageType - The type of storage.
   * @param {number} duration - The duration of the booking in weeks.
   * @param {string} userName - The name of the user making the booking.
   * @returns {Promise<{ orderId: string, bookingId: string }>} An object containing the order and booking IDs.
   * @throws {Error} If there's an error during the booking creation process.
   */
  async createBooking(userId, storageId, boxes, amount, storageType, duration, userName) {
    try {
      const storage = await this.getStorageInfo(storageId);
      const order = await this.createRazorpayOrder(amount);
      const bookingDocumentRef = await this.addBookingToFirebase(
        userId,
        storageId,
        userName,
        storage,
        boxes,
        amount,
        storageType,
        order,
        duration
      );
      return { orderId: order.id, bookingId: bookingDocumentRef.id };
    } catch (err) {
      l.error("[BOOKING: CREATE BOOKING]", err);
      throw err;
    }
  }

  /**
   * Retrieve a booking document from Firebase.
   *
   * @param {string} bookingId - The unique booking ID.
   * @returns {Promise<firebase.firestore.DocumentSnapshot>} The booking document.
   */
  async getBookingDocument(bookingId) {
    const booking = await this.bookingCollectionRef.doc(bookingId).get();
    return booking;
  }

  /**
   * Validate the booking document.
   *
   * @param {firebase.firestore.DocumentSnapshot} booking - The booking document to validate.
   * @throws {Object} If the booking document does not exist.
   */
  validateBooking(booking) {
    if (!booking.exists) {
      throw { status: 402, message: "Order not found, please try again" };
    }
  }

  /**
   * Generate a payment order ID.
   *
   * @param {string} razorpayOrderId - The order ID from Razorpay.
   * @param {string} razorpayPaymentId - The payment ID from Razorpay.
   * @returns {string} The concatenated payment order ID.
   */
  getPaymentOrderId(razorpayOrderId, razorpayPaymentId) {
    return razorpayOrderId + "|" + razorpayPaymentId;
  }

  /**
   * Verify the payment signature.
   *
   * @param {firebase.firestore.DocumentSnapshot} booking - The booking document.
   * @param {string} paymentOrderId - The payment order ID.
   * @param {string} razorpaySignature - The payment signature from Razorpay.
   * @throws {Object} If the payment verification fails.
   */
  verifyPayment(booking, paymentOrderId, razorpaySignature) {
    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(paymentOrderId)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      throw { status: 402, message: "Payment verification failed" };
    }
  }

  /**
   * Update the booking payment status.
   *
   * @param {firebase.firestore.DocumentSnapshot} booking - The booking document.
   * @returns {Promise<void>} A promise that resolves when the update is complete.
   */
  async updateBookingPaymentStatus(booking) {
    await booking.ref.update({
      paid: true,
      paidAt: new Date(),
    });
  }

  /**
   * Retrieve storage information from Firebase.
   *
   * @param {string} storageId - The unique storage facility ID.
   * @returns {Promise<firebase.firestore.DocumentSnapshot>} The storage information.
   */
  async getStorageInfo(storageId) {
    const storage = await this.storageCollectionRef.doc(storageId).get();
    return storage;
  }

  /**
   * Create a Razorpay order.
   *
   * @param {number} amount - The booking amount.
   * @returns {Promise<{ id: string }>} The created Razorpay order.
   */
  async createRazorpayOrder(amount) {
    const order = await razorpayInstance.orders.create({
      amount: (amount * 100).toString(),
      currency: "INR",
      receipt: nanoid(),
    });
    return order;
  }

  /**
   * Add a new booking to Firebase.
   *
   * @param {string} userId - The unique user ID.
   * @param {string} storageId - The unique storage facility ID.
   * @param {string} userName - The name of the user making the booking.
   * @param {firebase.firestore.DocumentSnapshot} storage - The storage information.
   * @param {number} boxes - The number of boxes to be booked.
   * @param {number} amount - The booking amount.
   * @param {string} storageType - The type of storage.
   * @param {{ id: string }} order - The Razorpay order.
   * @param {number} duration - The duration of the booking in weeks.
   * @returns {Promise<firebase.firestore.DocumentReference>} The reference to the booking document added to Firebase.
   */
  async addBookingToFirebase(userId, storageId, userName, storage, boxes, amount, storageType, order, duration) {
    const bookingDocumentRef = await this.bookingCollectionRef.add({
      storageId,
      userId,
      userName,
      storageName: storage.data().name,
      image: storage.data().images ? storage.data().images[0] : "",
      boxes,
      amount,
      address: storage.data().address,
      phone: storage.data().phone,
      storageType,
      orderId: order.id,
      fromDate: new Date(),
      toDate: new Date(
        new Date().getTime() + duration * 7 * 24 * 60 * 60 * 1000
      ),
      paid: false,
    });
    return bookingDocumentRef;
  }
}

export default new BookingService();
