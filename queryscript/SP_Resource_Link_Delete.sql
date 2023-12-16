ALTER PROCEDURE SP_Resource_Link_Delete
    @LinkID INT
AS
BEGIN
    DELETE FROM resource_link
    WHERE LinkID = @LinkID;
END