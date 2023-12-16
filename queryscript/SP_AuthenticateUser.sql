ALTER PROCEDURE SP_AuthenticateUser
    @Username NVARCHAR(50),
    @Password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT;

    -- Check if the user exists and is active
    SELECT @UserID = UserID
    FROM Account_Admin
    WHERE Username = @Username
        AND Password = @Password
        AND IsActive = 1;

    -- If the user exists and is active, log the login time
    IF @UserID IS NOT NULL
    BEGIN
        INSERT INTO Log_AdminLogin (UserID, LoginTime)
        VALUES (@UserID, GETDATE());

        -- Update the last login time for the user
        UPDATE Account_Admin
        SET LastLogin = GETDATE()
        WHERE UserID = @UserID;

        SELECT 1 AS Authenticated;
    END
    ELSE
    BEGIN
        SELECT 0 AS Authenticated;
    END
END;