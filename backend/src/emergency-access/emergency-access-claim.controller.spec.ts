import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EmergencyAccessClaimController } from "./emergency-access-claim.controller";
import { EmergencyAccessContact } from "./entities/emergency-access-contact.entity";
import { EmergencyAccessSettings } from "./entities/emergency-access-settings.entity";
import { User } from "../users/entities/user.entity";
import { TokenService } from "../auth/token.service";
import { AuthService } from "../auth/auth.service";
import { PasswordBreachService } from "../auth/password-breach.service";
import { AiEncryptionService } from "../ai/ai-encryption.service";
import { hashToken } from "../auth/crypto.util";

describe("EmergencyAccessClaimController", () => {
  let controller: EmergencyAccessClaimController;
  let contactsRepo: Record<string, jest.Mock>;
  let settingsRepo: Record<string, jest.Mock>;
  let usersRepo: Record<string, jest.Mock>;
  let tokenService: Record<string, jest.Mock>;
  let authService: Record<string, jest.Mock>;
  let passwordBreach: Record<string, jest.Mock>;
  let encryption: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: Record<string, jest.Mock>;
  };
  let dataSource: { createQueryRunner: jest.Mock };

  const ownerId = "11111111-1111-1111-1111-111111111111";
  const RAW_TOKEN = "a".repeat(64);
  const TOKEN_HASH = hashToken(RAW_TOKEN);

  beforeEach(async () => {
    contactsRepo = { findOne: jest.fn() };
    settingsRepo = { findOne: jest.fn() };
    usersRepo = { findOne: jest.fn() };
    tokenService = {
      revokeAllUserRefreshTokens: jest.fn(),
      generateTokenPair: jest
        .fn()
        .mockResolvedValue({ accessToken: "a", refreshToken: "r" }),
      getRefreshExpiryMs: jest.fn().mockReturnValue(1000),
    };
    authService = { getCsrfKey: jest.fn().mockReturnValue("k".repeat(32)) };
    passwordBreach = { isBreached: jest.fn().mockResolvedValue(false) };
    encryption = {
      isConfigured: jest.fn().mockReturnValue(true),
      decrypt: jest.fn((s) => s.replace(/^enc\(/, "").replace(/\)$/, "")),
    };
    configService = {
      get: jest.fn((_key: string, fallback: string) => fallback),
    };

    const updateBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(async (row) => row),
        delete: jest.fn(),
        createQueryBuilder: jest.fn(() => updateBuilder),
      },
    };
    dataSource = { createQueryRunner: jest.fn(() => queryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmergencyAccessClaimController],
      providers: [
        {
          provide: getRepositoryToken(EmergencyAccessContact),
          useValue: contactsRepo,
        },
        {
          provide: getRepositoryToken(EmergencyAccessSettings),
          useValue: settingsRepo,
        },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: TokenService, useValue: tokenService },
        { provide: AuthService, useValue: authService },
        { provide: PasswordBreachService, useValue: passwordBreach },
        { provide: AiEncryptionService, useValue: encryption },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get(EmergencyAccessClaimController);
  });

  describe("preview", () => {
    it("returns owner info + decrypted message for a valid token", async () => {
      contactsRepo.findOne.mockResolvedValue({
        id: "c1",
        ownerUserId: ownerId,
        firstName: "Carol",
        claimTokenHash: TOKEN_HASH,
        claimTokenExpiresAt: new Date(Date.now() + 100000),
        claimTokenUsedAt: null,
      });
      settingsRepo.findOne.mockResolvedValue({
        ownerUserId: ownerId,
        messageCiphertext: "enc(secret)",
      });
      usersRepo.findOne.mockResolvedValue({
        id: ownerId,
        firstName: "Owner",
        lastName: "One",
      });

      const res = await controller.preview({ token: RAW_TOKEN });
      expect(res.ownerFirstName).toBe("Owner");
      expect(res.contactFirstName).toBe("Carol");
      expect(res.message).toBe("secret");
    });

    it("rejects an unknown / used / expired token", async () => {
      contactsRepo.findOne.mockResolvedValue(null);
      await expect(
        controller.preview({ token: RAW_TOKEN }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects an expired token", async () => {
      contactsRepo.findOne.mockResolvedValue({
        claimTokenHash: TOKEN_HASH,
        claimTokenExpiresAt: new Date(Date.now() - 1000),
        claimTokenUsedAt: null,
      });
      await expect(
        controller.preview({ token: RAW_TOKEN }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("complete", () => {
    function makeRes(): {
      cookie: jest.Mock;
      json: jest.Mock;
    } {
      return { cookie: jest.fn(), json: jest.fn() };
    }

    it("rejects breached passwords", async () => {
      passwordBreach.isBreached.mockResolvedValue(true);
      const res = makeRes();
      await expect(
        controller.complete(
          { token: RAW_TOKEN, newPassword: "Password12345!" },
          res as never,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("replaces credentials, voids sibling tokens, and signs in", async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce({
          id: "c1",
          ownerUserId: ownerId,
          claimTokenHash: TOKEN_HASH,
          claimTokenExpiresAt: new Date(Date.now() + 100000),
          claimTokenUsedAt: null,
        })
        .mockResolvedValueOnce({ id: ownerId });
      usersRepo.findOne.mockResolvedValue({ id: ownerId, isActive: true });

      const res = makeRes();
      await controller.complete(
        { token: RAW_TOKEN, newPassword: "Aa1!correcthorse" },
        res as never,
      );

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(tokenService.revokeAllUserRefreshTokens).toHaveBeenCalledWith(
        ownerId,
      );
      expect(tokenService.generateTokenPair).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith(
        "auth_token",
        "a",
        expect.any(Object),
      );
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("rolls back when the token is no longer valid in-transaction", async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce(null);
      const res = makeRes();
      await expect(
        controller.complete(
          { token: RAW_TOKEN, newPassword: "Aa1!correcthorse" },
          res as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });
  });
});
