import { PostScope, PostType, UserRole } from "@prisma/client";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { FORBIDDEN_KEYWORDS_POLICY_KEY } from "@/lib/forbidden-keyword-policy";
import { prisma } from "@/lib/prisma";
import { createPost } from "@/server/services/post.service";
import { assertUserInteractionAllowed } from "@/server/services/sanction.service";
import { ServiceError } from "@/server/services/service-error";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    guestAuthor: {
      create: vi.fn(),
    },
    siteSetting: {
      findUnique: vi.fn(),
    },
    community: {
      findUnique: vi.fn(),
    },
    post: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    guestBan: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    guestViolation: {
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/sanction.service", () => ({
  assertUserInteractionAllowed: vi.fn(),
}));

const mockPrisma = vi.mocked(prisma) as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  guestAuthor: {
    create: ReturnType<typeof vi.fn>;
  };
  siteSetting: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  community: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  post: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  guestBan: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  guestViolation: {
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};
const mockAssertUserInteractionAllowed = vi.mocked(assertUserInteractionAllowed);

describe("createPost new-user restriction", () => {
  const petTypeId = "ckc7k5qsj0000u0t8qv6d1d7k";

  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
    mockPrisma.guestAuthor.create.mockReset();
    mockPrisma.siteSetting.findUnique.mockReset();
    mockPrisma.siteSetting.findUnique.mockResolvedValue(null);
    mockPrisma.community.findUnique.mockReset();
    mockPrisma.community.findUnique.mockResolvedValue({ id: petTypeId, isActive: true });
    mockPrisma.guestBan.findFirst.mockReset();
    mockPrisma.guestBan.findFirst.mockResolvedValue(null);
    mockPrisma.guestBan.create.mockReset();
    mockPrisma.guestViolation.create.mockReset();
    mockPrisma.guestViolation.create.mockResolvedValue({ id: "violation-1" });
    mockPrisma.guestViolation.count.mockReset();
    mockPrisma.guestViolation.count.mockResolvedValue(0);
    mockPrisma.post.create.mockReset();
    mockPrisma.post.create.mockResolvedValue({
      id: "post-1",
      title: "테스트 글",
      content: "본문",
      type: PostType.FREE_POST,
      scope: PostScope.GLOBAL,
    });
    mockPrisma.user.create.mockResolvedValue({ id: "guest-user-1" });
    mockPrisma.guestAuthor.create.mockResolvedValue({ id: "guest-author-1" });
    mockAssertUserInteractionAllowed.mockReset();
    mockAssertUserInteractionAllowed.mockResolvedValue();
  });

  it("blocks restricted post types for new users", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "마켓 테스트",
          content: "새 계정 제한 검증",
          type: PostType.MARKET_LISTING,
          scope: PostScope.GLOBAL,
          animalTags: ["강아지"],
          imageUrls: [],
        },
      }),
    ).rejects.toMatchObject({
      code: "NEW_USER_RESTRICTED_TYPE",
      status: 403,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("allows unrestricted categories even for new users", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "자유글 테스트",
          content: "작성 가능",
          type: PostType.FREE_POST,
          scope: PostScope.GLOBAL,
          petTypeId,
          imageUrls: [],
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.post.create).toHaveBeenCalledTimes(1);
  });

  it("blocks new users when contact info is included in content", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "자유글",
          content: "문의는 010-1234-5678",
          type: PostType.FREE_POST,
          scope: PostScope.GLOBAL,
          petTypeId,
          imageUrls: [],
        },
      }),
    ).rejects.toMatchObject({
      code: "CONTACT_RESTRICTED_FOR_NEW_USER",
      status: 403,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("blocks forbidden keywords in hospital review structured fields", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });
    mockPrisma.siteSetting.findUnique.mockImplementation(async ({ where }) => {
      if (where.key === FORBIDDEN_KEYWORDS_POLICY_KEY) {
        return { value: ["불법"] };
      }
      return null;
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "병원 후기",
          content: "본문",
          type: PostType.HOSPITAL_REVIEW,
          scope: PostScope.GLOBAL,
          animalTags: ["강아지"],
          imageUrls: [],
          hospitalReview: {
            hospitalName: "불법 동물병원",
          },
        },
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN_KEYWORD_DETECTED",
      status: 400,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("blocks new users when contact info is included in hospital review structured fields", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "병원 후기",
          content: "본문",
          type: PostType.HOSPITAL_REVIEW,
          scope: PostScope.GLOBAL,
          animalTags: ["강아지"],
          imageUrls: [],
          hospitalReview: {
            treatmentType: "문의는 010-1234-5678",
          },
        },
      }),
    ).rejects.toMatchObject({
      code: "CONTACT_RESTRICTED_FOR_NEW_USER",
      status: 403,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("masks contact info in hospital review structured fields for older users", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "병원 후기",
          content: "본문",
          type: PostType.HOSPITAL_REVIEW,
          scope: PostScope.GLOBAL,
          animalTags: ["강아지"],
          imageUrls: [],
          hospitalReview: {
            treatmentType: "문의는 010-1234-5678",
          },
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hospitalReview: {
            create: expect.objectContaining({
              treatmentType: "문의는 010-****-5678",
            }),
          },
        }),
      }),
    );
  });

  it("blocks sanctioned users before creating a post", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
    });
    mockAssertUserInteractionAllowed.mockRejectedValue(
      new ServiceError("정지", "ACCOUNT_SUSPENDED", 403),
    );

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "정지 테스트",
          content: "작성 차단",
          type: PostType.FREE_POST,
          scope: PostScope.GLOBAL,
          petTypeId,
          imageUrls: [],
        },
      }),
    ).rejects.toMatchObject({
      code: "ACCOUNT_SUSPENDED",
      status: 403,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("allows restricted categories for accounts older than 24 hours", async () => {
    const now = new Date();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "실종 공지 테스트",
          content: "작성 가능",
          type: PostType.LOST_FOUND,
          scope: PostScope.GLOBAL,
          animalTags: ["강아지"],
          imageUrls: [],
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.post.create).toHaveBeenCalledTimes(1);
  });

  it("allows guest users to write allowed global categories", async () => {
    await expect(
      createPost({
        input: {
          title: "비회원 자유글",
          content: "텍스트만 작성",
          type: PostType.FREE_BOARD,
          scope: PostScope.GLOBAL,
          petTypeId,
          guestDisplayName: "익명작성자",
          guestPassword: "1234",
          imageUrls: [],
        },
        guestIdentity: {
          ip: "127.0.0.1",
          fingerprint: "guest-fp-1",
        },
      }),
    ).resolves.toBeTruthy();

    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.guestAuthor.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.post.create).toHaveBeenCalledTimes(1);
  });

  it("blocks restricted categories for guest users", async () => {
    await expect(
      createPost({
        input: {
          title: "비회원 번개",
          content: "모임 글",
          type: PostType.MEETUP,
          scope: PostScope.GLOBAL,
          petTypeId,
          guestDisplayName: "익명작성자",
          guestPassword: "1234",
          imageUrls: [],
        },
        guestIdentity: {
          ip: "127.0.0.1",
          fingerprint: "guest-fp-2",
        },
      }),
    ).rejects.toMatchObject({
      code: "GUEST_RESTRICTED_TYPE",
      status: 403,
    });

    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it("maps common board fields by post type", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });

    await createPost({
      authorId: "user-1",
      input: {
        title: "병원 후기",
        content: "도움 됨",
        type: PostType.HOSPITAL_REVIEW,
        scope: PostScope.GLOBAL,
        animalTags: ["강아지", "강아지", "  고양이  "],
      },
    });

    expect(mockPrisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          boardScope: "COMMON",
          commonBoardType: "HOSPITAL",
          petTypeId: null,
          animalTags: ["강아지", "고양이"],
        }),
      }),
    );
  });

  it("allows lost-found common board without animal tags", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "실종 제보",
          content: "내용",
          type: PostType.LOST_FOUND,
          scope: PostScope.GLOBAL,
        },
      }),
    ).resolves.toBeTruthy();
  });

  it("allows market-listing common board without animal tags", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "공동구매 제안",
          content: "내용",
          type: PostType.MARKET_LISTING,
          scope: PostScope.GLOBAL,
        },
      }),
    ).resolves.toBeTruthy();
  });

  it("forces fixed scope by post type", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });

    await createPost({
      authorId: "user-1",
      input: {
        title: "병원 후기",
        content: "내용",
        type: PostType.HOSPITAL_REVIEW,
        scope: PostScope.LOCAL,
        animalTags: ["강아지"],
      },
    });

    await createPost({
      authorId: "user-1",
      input: {
        title: "동네 모임",
        content: "내용",
        type: PostType.MEETUP,
        scope: PostScope.GLOBAL,
        neighborhoodId: petTypeId,
        petTypeId,
      },
    });

    expect(mockPrisma.post.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          scope: PostScope.GLOBAL,
        }),
      }),
    );
    expect(mockPrisma.post.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          scope: PostScope.LOCAL,
        }),
      }),
    );
  });

  it("allows free-board post types without community", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "자유글",
          content: "본문",
          type: PostType.FREE_BOARD,
          scope: PostScope.GLOBAL,
        },
      }),
    ).resolves.toBeTruthy();
  });

  it("requires community for non-free community-board post types", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: UserRole.USER,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    });

    await expect(
      createPost({
        authorId: "user-1",
        input: {
          title: "질문글",
          content: "본문",
          type: PostType.QA_QUESTION,
          scope: PostScope.GLOBAL,
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      status: 400,
    });
  });
});
