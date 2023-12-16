ALTER PROCEDURE SP_Resource_Link_Search
    @LinkUrl NVARCHAR(500) = NULL,
    @Type NVARCHAR(50) = NULL,
    @Description NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT LinkId, LinkUrl, Type, Description
    FROM resource_link
    WHERE (@LinkUrl IS NULL OR LinkUrl LIKE @LinkUrl + '%')
        AND (@Type IS NULL OR Type LIKE @Type + '%')
        AND (@Description IS NULL OR Description LIKE @Description + '%');
END;
