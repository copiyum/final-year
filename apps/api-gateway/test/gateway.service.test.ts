import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { GatewayService } from '../src/gateway.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';

describe('GatewayService', () => {
    let service: GatewayService;
    let mockHttpService: any;

    beforeEach(async () => {
        mockHttpService = {
            request: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GatewayService,
                {
                    provide: HttpService,
                    useValue: {
                        request: jest.fn(),
                    }
                },
            ],
        }).compile();

        service = module.get<GatewayService>(GatewayService);
        mockHttpService = module.get(HttpService);
    });

    it('should proxy request to ledger service', async () => {
        const mockResponse = { data: { success: true } };
        mockHttpService.request.mockReturnValue(of(mockResponse));

        const result = await service.proxyRequest('ledger', 'GET', '/events');

        expect(mockHttpService.request).toHaveBeenCalledWith({
            method: 'GET',
            url: 'http://localhost:3000/events',
            data: undefined
        });
        expect(result).toEqual({ success: true });
    });

    it('should proxy request to credential service', async () => {
        const mockResponse = { data: { issued: true } };
        mockHttpService.request.mockReturnValue(of(mockResponse));

        const result = await service.proxyRequest('credential', 'POST', '/issue', { holders: [] });

        expect(mockHttpService.request).toHaveBeenCalledWith({
            method: 'POST',
            url: 'http://localhost:3004/issue',
            data: { holders: [] }
        });
        expect(result).toEqual({ issued: true });
    });
});
