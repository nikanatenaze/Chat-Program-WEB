import { UserClass } from "./user.class";

describe('UserClass', () => {
  it('should create an instance', () => {
    const user = new UserClass(
      1,
      'Nika',
      'nika@test.com',
      "2025-01-01T10:00:00Z"
    );

    expect(user).toBeTruthy();
  });
});
