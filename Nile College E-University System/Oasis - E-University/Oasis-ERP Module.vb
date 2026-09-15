Imports System.Data.SqlClient

Module Viking_Energy
    'Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=192.168.2.1;initial catalog=NileCollege;user id=sa;password=123")

    'Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=(local);initial catalog=NileCollege;integrated security=SSPI")
    'Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=192.168.0.5;initial catalog=Oasis-ERP - Khartoum College;user id=sa;password=flatron@123")
    ''Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=(local);initial catalog=Oasis-ERP - Khartoum College;user id=sa;password=123")
    'Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=(local);initial catalog=Oasis-ERP - Khartoum College;user id=sa;password=flatron@123")
    'Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=(local);initial catalog=Oasis-ERP - Khartoum College;integrated security=SSPI")
    ' Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=192.168.0.5;initial catalog=Oasis-ERP - Khartoum College;user id=sa;password=flatron@123")
    Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=(local);initial catalog=Oasis-ERP - Khartoum College;user id=sa;password=flatron@123")

    'Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=(local);initial catalog=UOT;user id=sa;password=123")
    ' Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=192.168.0.5;uot;user id=sa;password=flatron")

    ' Public cnn, cnn1, cnn2, cnn3, cnn4 As New SqlConnection("data source=192.168.1.15;initial catalog=NileCollege;user id=sa;password=bob@0922598008")

    Public CurrentUser, CurrentUserID As String
    Public PWD As String
    Public G_OK As Boolean
    Public SelStudID, SelStudName, SelProgram, STDColeg As String
    Public regfee, tutfee, RegFees As Double
    Public FAR, SAr, THAr, TypeAD, type, ForAr, Coleg, Program, FirEngName, SeEngName, ThEngName, FoEnName, TypeofCe, PlaceofBirth, Parent0, ParentJob, Relevant, ParentAddress, ParentPhone, PhoneNo, school, Address, NatioNo, Nationality, Dyana, Status, Email As String
    Public Gender, UniversityID, Year As Integer
    Public RptViewer As New ReportViewer
    Public Mainfrm As New frmMainFin
End Module
