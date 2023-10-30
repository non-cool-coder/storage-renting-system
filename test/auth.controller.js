import chai from 'chai';
import request from 'supertest';
import Server from '../server'; // Assuming this is where your server is defined
import AuthService from '../../services/auth.service';

const expect = chai.expect;

describe('Auth Controller', () => {
  it('should sign up a new user', async () => {
    const userData = {
      name: 'Test User',
      phone: '1234567890',
      email: 'test@example.com',
      state: 'Test State',
      city: 'Test City',
    };

    const response = await request(Server)
      .post('/api/v1/auth/signupUser')
      .set('Authorization', 'Bearer YOUR_AUTH_TOKEN') // Replace with a valid token
      .send(userData)
      .expect('Content-Type', /json);

    expect(response.status).to.equal(200);
    expect(response.body.message).to.equal('User registered successfully');
  });

  it('should sign up a new storage', async () => {
    const storageData = {
      name: 'Test Storage',
      phone: '9876543210',
      email: 'storage@example.com',
      state: 'Test State',
      city: 'Test City',
      pincode: '12345',
      address: '123 Test St',
      location: 'Test Location',
      aadhar: '1234 5678 9012',
      pan: 'ABCDE1234F',
    };

    const response = await request(Server)
      .post('/api/v1/auth/signupStorage')
      .set('Authorization', 'Bearer YOUR_AUTH_TOKEN') // Replace with a valid token
      .send(storageData)
      .expect('Content-Type', /json);

    expect(response.status).to.equal(200);
    expect(response.body.message).to.equal('Storage registered successfully');
  });

  it('should get user details', async () => {
    // Assuming you have a valid user UID, you can use it to retrieve user details
    const user = await AuthService.getUser(YOUR_USER_UID);

    const response = await request(Server)
      .get('/api/v1/auth/getUserDetails')
      .set('Authorization', 'Bearer YOUR_AUTH_TOKEN') // Replace with a valid token
      .expect('Content-Type', /json);

    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal(user);
  });
});
