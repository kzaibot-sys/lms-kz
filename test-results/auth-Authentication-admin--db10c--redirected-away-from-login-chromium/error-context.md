# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "LMS Platform" [level=1] [ref=e5]
      - paragraph [ref=e6]: Вход в систему
    - generic [ref=e7]:
      - heading "Введите данные для входа" [level=2] [ref=e8]
      - paragraph [ref=e9]: Используйте email и пароль, выданные администратором
      - generic [ref=e10]:
        - generic [ref=e11]: Неверный email или пароль
        - generic [ref=e12]:
          - generic [ref=e13]: Email
          - textbox "Email" [ref=e14]:
            - /placeholder: введите email
            - text: admin@lms.kz
        - generic [ref=e15]:
          - generic [ref=e16]:
            - generic [ref=e17]: Пароль
            - link "Забыли пароль?" [ref=e18] [cursor=pointer]:
              - /url: /forgot-password
          - textbox "Пароль" [ref=e19]:
            - /placeholder: введите пароль
            - text: AdminLms2026!
        - button "Войти" [active] [ref=e20] [cursor=pointer]
    - paragraph [ref=e21]: © 2026 LMS Platform
  - region "Notifications (F8)":
    - list
  - alert [ref=e22]
```