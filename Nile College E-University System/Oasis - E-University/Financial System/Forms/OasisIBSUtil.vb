Imports System.Data.SqlClient

Module OasisIBSUtil

    Public Function ValidateDate(ByVal TransDate As Date) As Boolean
        Try
            Dim LockDate As Date
            Dim cmd As New SqlCommand("Select LockDate From LockDate", cnn1)

            cnn1.Open()
            LockDate = CDate(cmd.ExecuteScalar)
            cnn1.Close()

            If TransDate <= LockDate Then
                Return False
            Else
                Return True
            End If
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
        End Try
    End Function

    Public Function GetAccGroupNo() As Double
        Try
            Dim cmd As New SqlCommand("Select IsNull(Count(Distinct Acc1),0) From Acc Where Acc2 Is Null", cnn4)
            Dim AccGroupNo As Double

            cnn4.Open()
            AccGroupNo = CDbl(cmd.ExecuteScalar) + 1
            cnn4.Close()

            Return AccGroupNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetAccName(ByVal AccNo As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(Acc4,N'') From Acc Where AccNo=@AccNo", cnn4)
            Dim AccName As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@AccNo", AccNo)

            AccName = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccName
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetInsurCompAccNo(ByVal InsurComp As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'') From Acc Where Acc1=N'Assets' and Acc2=N'Current Assets' " & _
                                      "and Acc3=N'Accounts Receivable (Commission from Insurance Companies)' and Acc4=@Acc4", cnn4)
            Dim AccNo As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@Acc4", InsurComp)

            AccNo = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetProducerAccNo(ByVal InsurComp As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'') From Acc Where Acc1=N'Liabilities' and Acc2=N'Current Liabilities' " & _
                                      "and Acc3=N'Accounts Payable (Sub-Brokers)' and Acc4=@Acc4", cnn4)
            Dim AccNo As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@Acc4", InsurComp)

            AccNo = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetAccNo(ByVal Acc1 As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'') From Acc Where Acc1=@Acc1 and Acc2=N''", cnn4)
            Dim AccNo As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@Acc1", Acc1)

            AccNo = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetAccNo(ByVal Acc1 As String, ByVal Acc2 As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'') From Acc Where Acc1=@Acc1 and Acc2=@Acc2 and Acc3=N''", cnn4)
            Dim AccNo As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@Acc1", Acc1)
            cmd.Parameters.AddWithValue("@Acc2", Acc2)

            AccNo = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetAccNo(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'') From Acc Where Acc1=@Acc1 and Acc2=@Acc2 and Acc3=@Acc3 " & _
                                      " and Acc4=N''", cnn4)
            Dim AccNo As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@Acc1", Acc1)
            cmd.Parameters.AddWithValue("@Acc2", Acc2)
            cmd.Parameters.AddWithValue("@Acc3", Acc3)

            AccNo = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetAccNo(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String, ByVal Acc4 As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'') From Acc Where Acc1=@Acc1 and Acc2=@Acc2 and Acc3=@Acc3 " & _
                                     "and Acc4=@Acc4", cnn4)
            Dim AccNo As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@Acc1", Acc1)
            cmd.Parameters.AddWithValue("@Acc2", Acc2)
            cmd.Parameters.AddWithValue("@Acc3", Acc3)
            cmd.Parameters.AddWithValue("@Acc4", Acc4)

            AccNo = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetAccNo(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String, ByVal Acc4 As String, ByVal Acc5 As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'') From Acc Where Acc1=@Acc1 and Acc2=@Acc2 and Acc3=@Acc3 " & _
                                    "and Acc4=@Acc4 and Acc5=@Acc5", cnn4)
            Dim AccNo As String

            cnn4.Open()

            'Add values
            cmd.Parameters.AddWithValue("@Acc1", Acc1)
            cmd.Parameters.AddWithValue("@Acc2", Acc2)
            cmd.Parameters.AddWithValue("@Acc3", Acc3)
            cmd.Parameters.AddWithValue("@Acc4", Acc4)
            cmd.Parameters.AddWithValue("@Acc5", Acc5)

            AccNo = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccNo
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Function ValidateAccNo(ByVal AccNo As String) As Boolean
        Try
            Dim cmd As New SqlCommand("Select IsNull(Count(*),0) From Acc Where AccNo=N'" & AccNo & "'", cnn)
            Dim X As Integer

            cnn.Open()
            X = CInt(cmd.ExecuteScalar)
            cnn.Close()

            If X > 0 Then
                Return True
            Else
                Return False
            End If
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Acc1 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactions Where Acc1=N'" & Acc1 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Acc1 As String, ByVal Acc2 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactions Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactions Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & _
                                      "' And Acc3=N'" & Acc3 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetBalanceAcc(ByVal Acc1 As String, ByVal Acc2 As String, ByVal Acc3 As String, ByVal Acc4 As String) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                      "From Transactions Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & _
                                      "' And Acc3=N'" & Acc3 & "' And Acc4=N'" & Acc4 & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Sub PrintVoucher(ByVal MoveNo As Integer, ByVal Month As Integer, ByVal Year As Integer)
        Try
            Dim dap As New SqlDataAdapter("select * From Transactions Where MoveNo=" & MoveNo & _
                                          " and Year(TransDate)= " & Year & " and Month(TransDate)= " & Month, cnn)
            Dim das As New DataSet

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New Voucher
            rpt.SetDataSource(das)
            rptViewer.CrystalReportViewer1.ReportSource = rpt
            rptViewer.CrystalReportViewer1.RefreshReport()
            rptViewer.ShowDialog()
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Public Sub PrintDebCrdNote(ByVal NoteType As String, ByVal SNo As Integer)
        Try
            Dim dap As New SqlDataAdapter("select MoveNo,CustID,CustName,TransType,PaperNo,Descr," & _
                                          "Acc1,Acc2,Acc3,Acc4,TotalIn+TotalOut TotalIn,Employee,TransDate " & _
                                          "From Transactions Where TransType=N'" & NoteType & "' and PaperNo=" & SNo, cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Dim rpt As New DebCrdNote
            rpt.SetDataSource(das)
            rptViewer.CrystalReportViewer1.ReportSource = rpt
            rptViewer.CrystalReportViewer1.RefreshReport()
            rptViewer.ShowDialog()
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Public Sub PrintPayBill(ByVal BranchBill As String, ByVal SNo As Integer)
        Try
            Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype=N'Pay' and PaperNo=" & SNo & _
                                          " and Branch=N'" & BranchBill & "' and TotalIn<>0", cnn)
            Dim das As New DataSet

            dap.Fill(das, "Transactions")

            Dim rpt As New PayBill
            rpt.SetDataSource(das)
            rptViewer.CrystalReportViewer1.ReportSource = rpt
            rptViewer.CrystalReportViewer1.RefreshReport()
            rptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Sub PrintReceiptBill(ByVal BranchBill As String, ByVal SNo As Integer)
        Try
            Dim dap As New SqlDataAdapter("Select * From Transactions Where Transtype=N'Receipt' and PaperNo=" & SNo & _
                                          " and Branch=N'" & BranchBill & "' and TotalOut<>0", cnn)
            Dim das As New DataSet

            dap.Fill(das, "Transactions")

            Dim rpt As New ReceiptBill
            rpt.SetDataSource(das)
            rptViewer.CrystalReportViewer1.ReportSource = rpt
            rptViewer.CrystalReportViewer1.RefreshReport()
            rptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Public Function GetAccTransBalance(ByVal Acc1 As String, ByVal Acc2 As String, ByVal MinDate As DateTime, ByVal MaxDate As DateTime) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                     "From Transactions Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & _
                                     "' and TransDate>N'" & MinDate & " 00:00:00' and TransDate<N'" & MaxDate & " 23:59:59'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetAccClosingBalance(ByVal Acc1 As String, ByVal Acc2 As String, ByVal MaxDate As DateTime) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                     "From Transactions Where Acc1=N'" & Acc1 & "' And Acc2=N'" & Acc2 & _
                                     "' and TransDate<N'" & MaxDate & " 23:59:59'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetCrdAged(ByVal Acc As String, ByVal Month As Integer, ByVal Year As Integer) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalIn)-Sum(TotalOut) Is Null Then 0 Else Sum(TotalIn)-Sum(TotalOut) End " & _
                                     "From Transactions Where Acc1=N'Creditors' And Acc2=N'" & Acc & _
                                     "' and Month(TransDate)=" & Month & " and Year(TransDate)=" & Year, cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetDebAged(ByVal Acc As String, ByVal Month As Integer, ByVal Year As Integer) As Double
        Try
            Dim cmd As New SqlCommand("Select Case When Sum(TotalOut)-Sum(TotalIn) Is Null Then 0 Else Sum(TotalOut)-Sum(TotalIn) End " & _
                                     "From Transactions Where Acc1=N'Current Assets' And Acc2=N'Debitors' And Acc3=N'" & Acc & _
                                     "' and Month(TransDate)=" & Month & " and Year(TransDate)=" & Year, cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetAccGroup(ByVal AccNo As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(Acc1,N'') From Acc Where AccNo=N'" & AccNo & "'", cnn4)
            Dim AccGroup As String

            cnn4.Open()
            AccGroup = CStr(cmd.ExecuteScalar)
            cnn4.Close()

            Return AccGroup
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetInsurClassList() As ArrayList
        Try
            Dim cmd As New SqlCommand("Select Distinct ClassName From InsurClasses", cnn)
            Dim Reader As SqlDataReader

            Dim InsurClasses As New ArrayList

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                InsurClasses.Add(Reader.Item(0))
            End While
            cnn.Close()

            Return InsurClasses
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetInsurCompaniesList() As ArrayList
        Try
            Dim cmd As New SqlCommand("Select Acc4 From Acc Where Acc1=N'Assets' and Acc2=N'Current Assets' and " & _
                                      "Acc3=N'Accounts Receivable (Commission from Insurance Companies)' and Acc4<>N'' Order by Acc4", cnn)
            Dim Reader As SqlDataReader

            Dim InsurCompanies As New ArrayList

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                InsurCompanies.Add(Reader.Item(0))
            End While
            cnn.Close()

            Return InsurCompanies
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetProducersList() As ArrayList
        Try
            Dim cmd As New SqlCommand("Select Acc4 From Acc Where Acc1=N'Liabilities' and Acc2=N'Current Liabilities' " & _
                                      "and Acc3=N'Accounts Payable (Sub-Brokers)' and Acc4<>N'' Order By Acc4", cnn)
            Dim Reader As SqlDataReader

            Dim ProducersList As New ArrayList

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                ProducersList.Add(Reader.Item(0))
            End While
            cnn.Close()

            Return ProducersList
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetAccNames(ByVal AccNo As String) As String()
        Try
            Dim cmd As New SqlCommand("Select Acc1,Acc2,Acc3,Acc4 From Acc Where AccNo=N'" & AccNo & "'", cnn)
            Dim Reader As SqlDataReader

            Dim AccNames(3) As String

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                AccNames(0) = Reader.Item(0)
                AccNames(1) = Reader.Item(1)
                AccNames(2) = Reader.Item(2)
                AccNames(3) = Reader.Item(3)
            End While
            cnn.Close()

            Return AccNames
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Public Function GetClientInsurCompBalance(ByVal ClientID As Integer, ByVal InsurComp As String) As Double
        Try
            Dim cmd As New SqlCommand("Select IsNull(Sum(TotalOut)-Sum(TotalIn),0) " & _
                                      "From ClientsAcc Where ClientID=" & ClientID & " and InsurCompany=N'" & InsurComp & "'", cnn4)
            Dim Balance As Double

            cnn4.Open()
            Balance = CDbl(cmd.ExecuteScalar)
            cnn4.Close()

            Return Balance
        Catch ex As Exception
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
        End Try
    End Function

    Public Function GetInsurCompPolAccNo(ByVal InsurComp As String, ByVal PolNo As String) As String
        Try
            Dim cmd As New SqlCommand("Select IsNull(AccNo,N'-') From Policies Where InsurComp=N'" & InsurComp & _
                                      "' and PolicyNo=N'" & PolNo & "'", cnn)
            Dim AccNo As String

            cnn.Open()
            AccNo = cmd.ExecuteScalar
            cnn.Close()

            Return AccNo
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function
End Module
