import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { FilesService } from './files.service';
import { testRunner, Mock } from '../../test/test-utils';

describe('FilesService', () => {
  let service: FilesService;
  let existsSyncSpy: Mock;

  beforeEach(async () => {
    // Clear mocks if your testRunner or setup provides such a utility globally
    // For instance, if testRunner has a clearAllMocks or if it's handled in setup files
    if (testRunner.clearAllMocks) testRunner.clearAllMocks(); 
    service = new FilesService();
    existsSyncSpy = testRunner.spyOn(fs, 'existsSync') as Mock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return the correct path if image exists', () => {
    // Mock that the image exists
    existsSyncSpy.mockReturnValue(true);
    
    const imageName = 'valid-image.jpg';
    
    // Get the actual result and verify it contains the image name
    const result = service.getStaticProductImage(imageName);
    
    // Only check that the result includes the image name, not exact path which varies by environment
    expect(result).toContain(imageName);
    expect(existsSyncSpy).toHaveBeenCalled();
  });

  it('should throw BadRequestException if the image does not exist', () => {
    // Mock that the image does not exist
    existsSyncSpy.mockReturnValue(false);
    
    const imageName = 'non-existent-image.jpg';

    // Verify that the service throws an exception
    expect(() => {
      service.getStaticProductImage(imageName);
    }).toThrow(BadRequestException);
    expect(() => {
      service.getStaticProductImage(imageName);
    }).toThrow(`No product found with image ${imageName}`);
    
    // Check if existsSync was called
    expect(existsSyncSpy).toHaveBeenCalled();
  });
});
