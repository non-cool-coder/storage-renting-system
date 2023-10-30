import { database } from "../../common/firebase";
import l from "../../common/logger";

/**
 * Service for user and storage registration/authentication.
 */
class AuthService {
  userCollectionRef = database.collection("users");
  storageCollectionRef = database.collection("storages");

  /**
   * Sign up a new storage.
   * @param {string} name - The name of the storage.
   * @param {string} phone - The phone number of the storage.
   * @param {string} email - The email of the storage.
   * @param {string} uid - The user ID of the storage.
   * @param {string} state - The state of the storage.
   * @param {string} city - The city of the storage.
   * @param {string} pincode - The pincode of the storage.
   * @param {string} address - The address of the storage.
   * @param {string} location - The location of the storage.
   * @param {string} aadhar - The Aadhar card of the storage.
   * @param {string} pan - The PAN card of the storage.
   * @returns {Promise<{ message: string }>} A message indicating the success of the registration.
   */
  async signupStorage(name, phone, email, uid, state, city, pincode, address, location, aadhar, pan) {
    try {
      await this.storageCollectionRef.doc(uid).set({
        name,
        phone,
        state,
        city,
        email,
        pincode,
        address,
        location,
        aadhar,
        pan,
        createdAt: new Date(),
      });
      return { message: "Storage registered successfully" };
    } catch (error) {
      l.error("[SIGNUP SERVICE STORAGE]", error);
      throw error;
    }
  }

  /**
   * Get user or storage information based on UID.
   * @param {string} uid - The user ID to retrieve information for.
   * @returns {Promise<object>} User or storage information, or an error if not found.
   */
  async getUser(uid) {
    try {
      const user = await this.userCollectionRef.doc(uid).get();
      if (user.exists) {
        return user.data();
      }
      const storage = await this.storageCollectionRef.doc(uid).get();
      if (storage.exists) {
        const dataToReturn = storage.data();
        dataToReturn.isStorage = true;
        return dataToReturn;
      } else {
        throw { status: 402, message: "User not found" };
      }
    } catch (error) {
      l.error("[GET USER]", error);
      throw error;
    }
  }

  /**
   * Sign up a new user.
   * @param {string} name - The name of the user.
   * @param {string} phone - The phone number of the user.
   * @param {string} email - The email of the user.
   * @param {string} uid - The user ID of the user.
   * @param {string} state - The state of the user.
   * @param {string} city - The city of the user.
   * @returns {Promise<{ message: string }>} A message indicating the success of the registration.
   */
  async signupUser(name, phone, email, uid, state, city) {
    try {
      await this.userCollectionRef.doc(uid).set({
        name,
        phone,
        state,
        city,
        email,
        createdAt: new Date(),
      });
      return { message: "User registered successfully" };
    } catch (error) {
      l.error("[SIGNUP SERVICE USER]", error);
      throw error;
    }
  }

  /**
   * Register a new user or storage based on the provided parameters.
   * @param {string} name - The name of the user or storage.
   * @param {string} phone - The phone number of the user or storage.
   * @param {string} email - The email of the user or storage.
   * @param {string} uid - The user ID of the user or storage.
   * @param {string} state - The state of the user or storage.
   * @param {string} city - The city of the user or storage.
   * @param {string} [pincode] - The pincode of the storage (optional).
   * @param {string} [address] - The address of the storage (optional).
   * @param {string} [location] - The location of the storage (optional).
   * @param {string} [aadhar] - The Aadhar card of the storage (optional).
   * @param {string} [pan] - The PAN card of the storage (optional).
   * @returns {Promise<{ message: string }>} A message indicating the success of the registration.
   */
  async registerUser(name, phone, email, uid, state, city, pincode, address, location, aadhar, pan) {
    if (pincode && address && location && aadhar && pan) {
      return this.signupStorage(name, phone, email, uid, state, city, pincode, address, location, aadhar, pan);
    } else {
      return this.signupUser(name, phone, email, uid, state, city);
    }
  }
}

export default new AuthService();
