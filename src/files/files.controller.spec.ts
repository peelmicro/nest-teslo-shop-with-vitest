import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { testRunner } from '../../test/test-utils';
import { Response } from 'express';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: FilesService;
  let configService: ConfigService;

  beforeEach(() => {
    // Create mocks
    filesService = {
      getStaticProductImage: testRunner.fn(),
    } as unknown as FilesService;
    
    configService = {
      get: testRunner.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as ConfigService;

    // Directly instantiate the controller with the mocked services
    controller = new FilesController(filesService, configService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return file path when findProductImage is called', () => {
    const imageName = 'test.jpg';
    const filePath = '/path/to/file.jpg';
    const mockResponse = {
      sendFile: testRunner.fn()
    } as unknown as Response;

    testRunner.spyOn(filesService, 'getStaticProductImage').mockReturnValue(filePath);

    controller.findProductImage(mockResponse, imageName);

    expect(mockResponse.sendFile).toHaveBeenCalled();
    expect(filesService.getStaticProductImage).toHaveBeenCalledWith(imageName);
  });

  it('should return a secureUrl when uploadProduct image is called with a file', () => {
    const file = {
      filename: 'test.jpg'
    } as unknown as Express.Multer.File;

    const result = controller.uploadProductImage(file);

    expect(result).toEqual({
      secureUrl: expect.stringContaining(file.filename),
      fileName: file.filename
    });
    expect(configService.get).toHaveBeenCalled();
  });

  it('should throw a BadRequestException if no file was provided', () => {
    expect(() => controller.uploadProductImage(null)).toThrow(
      new BadRequestException('Make sure that the file is an image'),
    );
  });
});
