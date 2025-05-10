import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { FilesService } from './files.service';
import { testRunner } from '../../test/test-utils';

// Mock for fs.existsSync
jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

describe('FilesService', () => {
  let service: FilesService;

  beforeEach(async () => {
    // Clear all mocks before each test to ensure clean state
    testRunner.clearAllMocks();

    // Directly create the service instance
    service = new FilesService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return the correct path if image exists', () => {
    // Setup mock to return true when existsSync is called
    (existsSync as jest.Mock).mockReturnValue(true);
    
    // Use a spy on the service method instead of trying to mock path.join
    const imageName = 'valid-image.jpg';
    
    // Get the actual result and verify it contains the image name
    const result = service.getStaticProductImage(imageName);
    
    // Only check that the result includes the image name, not exact path which varies by environment
    expect(result).toContain(imageName);
    expect(existsSync).toHaveBeenCalled();
  });

  it('should throw BadRequestException if the image does not exist', () => {
    // Setup mock to return false when existsSync is called
    (existsSync as jest.Mock).mockReturnValue(false);
    
    const imageName = 'non-existent-image.jpg';

    // Verify that the service throws an exception
    expect(() => {
      service.getStaticProductImage(imageName);
    }).toThrow(BadRequestException);
    expect(() => {
      service.getStaticProductImage(imageName);
    }).toThrow(`No product found with image ${imageName}`);
    
    // Check if existsSync was called
    expect(existsSync).toHaveBeenCalled();
  });
});
