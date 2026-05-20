#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_validate_password_length() {
    // Test password that's too short
    let result = validate_password("Short1!");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("12 characters"));
  }

  #[test]
  fn test_validate_password_no_uppercase() {
    let result = validate_password("lowercase123!");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("uppercase"));
  }

  #[test]
  fn test_validate_password_no_lowercase() {
    let result = validate_password("UPPERCASE123!");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("lowercase"));
  }

  #[test]
  fn test_validate_password_no_digit() {
    let result = validate_password("NoDigitsHere!");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("digit"));
  }

  #[test]
  fn test_validate_password_no_special() {
    let result = validate_password("NoSpecialChars123");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("special"));
  }

  #[test]
  fn test_validate_password_common_password() {
    let result = validate_password("Password123!");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("too common"));
  }

  #[test]
  fn test_validate_password_valid() {
    let result = validate_password("SecurePass123!");
    assert!(result.is_ok());
  }

  #[test]
  fn test_validate_password_very_strong() {
    let result = validate_password("MyV3ry$tr0ng!P@ssw0rd");
    assert!(result.is_ok());
  }
}