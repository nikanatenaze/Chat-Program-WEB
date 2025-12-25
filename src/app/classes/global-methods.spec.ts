import { GlobalMethods } from './global-methods';

describe('GlobalMethods', () => {
  it('should create an instance', () => {
    const mockUserService = {} as any;
    const mockAuth = {} as any;

    const gm = new GlobalMethods(mockUserService, mockAuth);
    expect(gm).toBeTruthy();
  });
});
