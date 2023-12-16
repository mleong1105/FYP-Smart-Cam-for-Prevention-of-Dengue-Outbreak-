ALTER PROCEDURE SP_Resource_Link_Add
    @LinkUrl NVARCHAR(500),
    @Type NVARCHAR(50),
    @Description NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT= ON

    IF NULLIF(@LinkUrl, '') IS NULL OR
       NULLIF(@Type, '') IS NULL OR
       NULLIF(@Description, '') IS NULL
    BEGIN
        -- At least one input parameter is null or empty
        RAISERROR('Input parameters cannot be null or empty.', 16, 1);
        RETURN;
    END;

    INSERT INTO resource_link (LinkUrl, LastScraped, Type, Description)
    VALUES (@LinkUrl, NULL, @Type, @Description);
END