ALTER PROCEDURE SP_Resource_Link_Update
    @LinkId INT,
    @LinkUrl NVARCHAR(500),
    @Type NVARCHAR(50),
    @Description NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    IF NULLIF(@LinkUrl, '') IS NULL OR
       NULLIF(@Type, '') IS NULL OR
       NULLIF(@Description, '') IS NULL
    BEGIN
        -- At least one input parameter is null or empty
        RAISERROR('Input parameters cannot be null or empty.', 16, 1);
        RETURN;
    END;
    
    UPDATE resource_link
    SET LinkUrl = ISNULL(@LinkUrl, LinkUrl),
        Type = ISNULL(@Type, Type),
        Description = ISNULL(@Description, Description)
    WHERE LinkID = @LinkId;

	SELECT LinkID, LinkUrl, Type, Description
    FROM resource_link
    WHERE LinkID = @LinkId;
END;

