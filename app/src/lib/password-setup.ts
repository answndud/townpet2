export function getPasswordSetupCopy(hasPassword: boolean) {
  if (hasPassword) {
    return {
      pageTitle: "비밀번호 변경",
      pageDescription:
        "현재 비밀번호를 확인한 뒤 새 비밀번호로 변경할 수 있습니다.",
      profileLinkLabel: "비밀번호 변경",
      currentPasswordLabel: "현재 비밀번호",
      currentPasswordPlaceholder: "현재 비밀번호",
      currentPasswordHint:
        "현재 비밀번호를 알아야 이 화면에서 바로 변경할 수 있습니다.",
      submitLabel: "비밀번호 변경",
      successMessage: "비밀번호가 변경되었습니다.",
    } as const;
  }

  return {
    pageTitle: "비밀번호 설정",
    pageDescription:
      "이 계정에는 아직 비밀번호가 없습니다. 새 비밀번호를 설정하면 이메일 로그인도 사용할 수 있습니다.",
    profileLinkLabel: "비밀번호 설정",
    currentPasswordLabel: "",
    currentPasswordPlaceholder: "",
    currentPasswordHint:
      "소셜 로그인 계정이라면 현재 비밀번호 없이 새 비밀번호를 바로 설정할 수 있습니다.",
    submitLabel: "비밀번호 설정",
    successMessage: "비밀번호가 설정되었습니다.",
  } as const;
}

export function validatePasswordSetupForm(input: {
  hasPassword: boolean;
  currentPassword: string;
  password: string;
  passwordConfirm: string;
}) {
  if (input.hasPassword && input.currentPassword.length === 0) {
    return "현재 비밀번호를 입력해 주세요.";
  }

  if (input.password !== input.passwordConfirm) {
    return "비밀번호가 일치하지 않습니다.";
  }

  return null;
}
