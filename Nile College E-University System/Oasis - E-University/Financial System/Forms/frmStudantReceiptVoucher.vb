Imports System.Data.SqlClient

Public Class frmStudantReceiptVoucher
    Sub fees1()
        Try

            Dim cmd As New SqlCommand("Select TuitionFees1 From Registrations Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn2)

            cnn2.Open()
            tutfee = cmd.ExecuteScalar
            cnn2.Close()


        Catch ex As Exception
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If

        End Try
    End Sub
    Sub fees()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select TuitionFees1,Regfee From Registrations Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn2)
            Dim reader As SqlDataReader
            cnn2.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                tutfee = CDbl(reader.Item("TuitionFees1")).ToString("N2")
                RegFees = CDbl(reader.Item("Regfee")).ToString("N2")
            End While
            cnn2.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Private Sub txtStudID_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStdIndex.KeyUp
        If e.KeyCode = Keys.Enter Then
            If Me.txtStdIndex.Text.Trim.Length > 0 Then
                Try
                    Me.Cursor = Cursors.WaitCursor

                    Me.txtStdName.Text = GetStudentName(Me.txtStdIndex.Text.Trim)
                    Me.txtBalance.Text = CDbl(GetStudentBalance(Me.txtStdIndex.Text.Trim, Me.txtStdName.Text.Trim))

                    ' FillStudProgram()
                    FillGrid()

                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn.State = ConnectionState.Open Then
                        cnn.Close()
                    End If
                    MsgBox(ex.ToString)
                End Try
            End If
        End If
    End Sub
    Function CheckReceiptNo(ByVal RecNo As String) As Boolean
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select IsNull(Count(*),0) From Transactions Where ReceiptNo=N'" & RecNo & "'", cnn)
            Dim Count As Integer

            cnn.Open()
            Count = CInt(cmd.ExecuteScalar)
            cnn.Close()

            If Count > 0 Then
                Me.Cursor = Cursors.Default
                Return True
            Else
                Me.Cursor = Cursors.Default
                Return False
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Private Sub txtStudID_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStdIndex.TextChanged
        Me.txtStdName.Clear()
        Me.GridVouchers.Rows.Clear()
        Me.txtBalance.Clear()
        Me.ErrProv.Clear()
    End Sub

    Sub FillGrid()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.GridVouchers.Rows.Clear()
            fees()
            Me.GridVouchers.Rows.Add(New String() {"Current Assets", "Debtors", "Students Fees", "Students Fees", "Tuition Fees", tutfee})
            Me.GridVouchers.Rows.Add(New String() {"Current Assets", "Debtors", "Students Fees", "Students Fees", "Registration Fees", RegFees})
            Calculate()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub CheckRadio()
        If RCash.Checked = True Then
            Me.txtChNo.Text = "Cash"
            Me.txtChNo.Enabled = False
            Me.CombBank.SelectedIndex = -1
            Me.CombBank.Enabled = False
        Else
            Me.txtChNo.Clear()
            Me.txtChNo.Enabled = True
            Me.CombBank.Enabled = True
            Me.txtChNo.Focus()
        End If
    End Sub

    Private Sub RCash_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RCash.CheckedChanged
        CheckRadio()
    End Sub

    Private Sub RBank_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RBank.CheckedChanged
        CheckRadio()
    End Sub

    Sub Clear()
        Me.txtStdIndex.Clear()
        Me.ErrProv.Clear()
        Me.txtStdName.Clear()
        Me.txtBalance.Clear()
        Me.GridVouchers.Rows.Clear()
        Me.txtTotalAmount.Clear()
        Me.txtWrittenValue.Clear()
        Me.DTPTrans.Value = Today.Date
        Me.RCash.Checked = True
        Me.txtReceiptNo.Clear()
        Me.txtReceiptNo.Focus()
    End Sub

    Sub Calculate()
        If Me.GridVouchers.Rows.Count = 0 Then
            Me.txtTotalAmount.Text = "0.00"
        Else
            Try
                Me.Cursor = Cursors.Default

                Dim TotalAmount As Double

                ' Iterate through the list
                For Each row As DataGridViewRow In Me.GridVouchers.Rows
                    TotalAmount += CDbl(row.Cells(5).Value)
                Next

                Me.txtTotalAmount.Text = TotalAmount.ToString("N2")

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub frmStudantReceiptVoucher_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Me.DTPTrans.Value = Now
        Clear()

        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct Acc4 From Acc1 Where Acc1=N'الاصول' " & _
                                      "and Acc2=N'الاصول المتداولة' and Acc3=N'(مدينون(الطلاب' and Acc4 Is Not Null", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.CombBank.Items.Add(Reader.Item(0))
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtTotalAmount_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtTotalAmount.TextChanged
        Try
            If Me.txtTotalAmount.Text.Trim.Length = 0 Then
                Me.txtWrittenValue.Clear()
            Else
                Me.txtWrittenValue.Text = SpellNumber(CDbl(Me.txtTotalAmount.Text)).ToString

                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("Dollar", "Pound")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("and No Cent", "")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text & " Only"
            End If
        Catch ex As Exception
            Me.txtTotalAmount.Clear()
            Me.txtTotalAmount.Focus()
        End Try
    End Sub

    Private Sub btnClose_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Clear()
    End Sub

    Private Sub btnGSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnGSave.Click

        Me.ErrProv.Clear()
        If Me.txtStdName.Text.Trim.Length = 0 Then
            Me.ErrProv.SetError(Me.txtStdIndex, "Please fill in")
            Me.txtStdIndex.Focus()
        Else
            If Me.RBank.Checked = True Then
                If Me.txtChNo.Text.Trim.Length = 0 Then
                    Me.ErrProv.SetError(Me.txtChNo, "Please fill in")
                    Me.txtChNo.Focus()
                    Exit Sub
                ElseIf Me.CombBank.SelectedIndex = -1 Then
                    Me.ErrProv.SetError(Me.CombBank, "Please fill in")
                    Me.CombBank.Focus()
                    Exit Sub
                End If
            End If

            Try
                Me.Cursor = Cursors.WaitCursor

                Dim MoveNo As Integer
                Dim SNo As Integer
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction
                Dim PaymentType As String
                Dim TransDate As String
                Dim CurentDate As String
                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans

                'Get Trans. Date
                TransDate = "N'" & Me.DTPTrans.Value.ToString("dd/MM/yyyy") & " 10:10:10'"
                ' TransDate = Me.DTPTrans.Value.ToString("dd/MM/yyyy")
                CurentDate = "N'" & Me.DTPTrans.Value.ToString("dd/MM/yyyy") & " 10:10:10'"

                'Get Payment Type
                If Me.RCash.Checked = True Then
                    PaymentType = "C"
                Else
                    PaymentType = "B"
                End If

                ''Get Move No.
                'cmd.CommandText = "Select IsNull(Max(MoveNo),0) From Transactions Where Year(TransDate)=Year(Getdate())"
                'MoveNo = CInt(cmd.ExecuteScalar) + 1

                ''Get Bill No.
                'cmd.CommandText = "Select IsNull(Max(BillNo),0) From Transactions Where Transtype=N'قيد يومية' and PaymentType=N'" & PaymentType & "'"
                'SNo = CInt(cmd.ExecuteScalar) + 1

                'For Each row As DataGridViewRow In Me.GridVouchers.Rows
                '    'Credit side
                '    'cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,ReceiptNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,ChNo," & _
                '    '                  "Writting,TotalValueIn,UserName,TransDate) " & _
                '    '                  "Values (@MoveNo,@TransType,@PaymentType,@SNo,@ReceiptNo,@Source,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@StudID,@StudName,@ChNo," & _
                '    '                  "@Writting,@TotalValueIn,@UserName," & CDate(TransDate) & ")"
                '    cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,PaymentType,BillNo,PaperNo,DestSource,Descr,AccNo,Acc1,Acc2,Acc3,Acc4,StudentID,StudentName,ChNo," & _
                '                      "Writting,TotalIn,SavedUser) " & _
                '                      "Values (@MoveNo,@TransType,@PaymentType,@BillNo,@PaperNo,@DestSource,@Descr,@AccNo,@Acc1,@Acc2,@Acc3,@Acc4,@StudentID,@StudentName,@ChNo," & _
                '                      "@Writting,@TotalIn,@SavedUser )"

                '    'Add values
                '    cmd.Parameters.Clear()
                '    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                '    cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
                '    cmd.Parameters.AddWithValue("@PaymentType", PaymentType)
                '    cmd.Parameters.AddWithValue("@BillNo", SNo)
                '    cmd.Parameters.AddWithValue("@PaperNo", Me.txtReceiptNo.Text.Trim)
                '    cmd.Parameters.AddWithValue("@DestSource", "(" + Me.txtStdIndex.Text.Trim + ") " + Me.txtStdName.Text.Trim)
                '    cmd.Parameters.AddWithValue("@Descr", row.Cells(4).Value)
                '    'cmd.Parameters.AddWithValue("@Acc1", row.Cells(0).Value)
                '    'cmd.Parameters.AddWithValue("@Acc2", row.Cells(1).Value)
                '    'cmd.Parameters.AddWithValue("@Acc3", row.Cells(2).Value)
                '    'cmd.Parameters.AddWithValue("@Acc4", row.Cells(3).Value)
                '    cmd.Parameters.AddWithValue("@Acc1", "الاصول")
                '    cmd.Parameters.AddWithValue("@Acc2", " الاصول الثابتة")
                '    cmd.Parameters.AddWithValue("@Acc3", "مدينون(الطلاب)")
                '    cmd.Parameters.AddWithValue("@Acc4", Me.txtStdName.Text.Trim)
                '    cmd.Parameters.AddWithValue("@AccNo", "120200000006")
                '    cmd.Parameters.AddWithValue("@ChNo", Me.txtChNo.Text.Trim)
                '    cmd.Parameters.AddWithValue("@StudentID", Me.txtStdIndex.Text.Trim)
                '    cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
                '    cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                '    cmd.Parameters.AddWithValue("@Writting", Me.txtWrittenValue.Text.Trim)
                '    cmd.Parameters.AddWithValue("@TotalIn", CDbl(row.Cells(5).Value))
                '    cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                '    cmd.ExecuteNonQuery()

                'Next


                ''Debit Side
                ''cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,ChNo," & _
                ''           "Writting,TotalValueOut,UserName,TransDate) " & _
                ''           "Values (@MoveNo,@TransType,@PaymentType,@SNo,@Source,N'Student Payment',@Acc1,@Acc2,@Acc3,@Acc4,@ChNo," & _
                ''           "@Writting,@TotalValueOut,@UserName," & CDate(TransDate) & ")"
                ''
                'cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,PaymentType,BillNo,DestSource,Descr,Acc1,Acc2,Acc3,Acc4,ChNo,AccNo," & _
                '          "Writting,TotalOut,SavedUser) " & _
                '          "Values (@MoveNo,@TransType,@PaymentType,@BillNo,@DestSource,N'Student Payment',@Acc1,@Acc2,@Acc3,@Acc4,@ChNo,@AccNo," & _
                '          "@Writting,@TotalOut,@SavedUser)"
                ''Add values
                'cmd.Parameters.Clear()
                'cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                'cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
                'cmd.Parameters.AddWithValue("@PaymentType", PaymentType)
                'cmd.Parameters.AddWithValue("@BillNo", SNo)
                'cmd.Parameters.AddWithValue("@DestSource", "(" + Me.txtStdIndex.Text.Trim + ") " + Me.txtStdName.Text.Trim)
                'cmd.Parameters.AddWithValue("@Acc1", "الايرادات")
                'cmd.Parameters.AddWithValue("@Acc2", " الايرادات الذاتية")
                'cmd.Parameters.AddWithValue("@AccNo", "310100000001")
                '' cmd.Parameters.AddWithValue("@AccNo", "120200000006")
                'If RCash.Checked = True Then 'Cash
                '    cmd.Parameters.AddWithValue("@Acc3", Me.CombBank.Text)
                '    ' cmd.Parameters.AddWithValue("@Acc4", "Cash on Hand")
                '    cmd.Parameters.AddWithValue("@Acc4", Me.txtStdName.Text.Trim)
                'Else 'Bank
                '    cmd.Parameters.AddWithValue("@Acc3", Me.CombBank.Text)
                '    cmd.Parameters.AddWithValue("@Acc4", Me.txtStdName.Text.Trim)
                'End If
                'cmd.Parameters.AddWithValue("@ChNo", Me.txtChNo.Text.Trim)
                'cmd.Parameters.AddWithValue("@Writting", Me.txtWrittenValue.Text.Trim)
                'cmd.Parameters.AddWithValue("@TotalOut", CDbl(Me.txtTotalAmount.Text.Trim))
                'cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                'cmd.ExecuteNonQuery()

                'Trans.Commit()
                'cnn.Close()

                'MsgBox("Saved Successfully")
                'Get Move No.
                cmd.CommandText = "Select IsNull(Max(MoveNo),0) From Transactionees Where Year(TransDate)=Year(Getdate())"
                MoveNo = CInt(cmd.ExecuteScalar) + 1

                'Get Bill No.
                cmd.CommandText = "Select IsNull(Max(SNo),0) From Transactionees Where Transtype=N'Receipt Voucher' and PaymentType=N'" & PaymentType & "'"
                SNo = CInt(cmd.ExecuteScalar) + 1

                For Each row As DataGridViewRow In Me.GridVouchers.Rows
                    'Credit side
                    'cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,ReceiptNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,ChNo," & _
                    '                  "Writting,TotalValueIn,UserName,TransDate) " & _
                    '                  "Values (@MoveNo,@TransType,@PaymentType,@SNo,@ReceiptNo,@Source,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@StudID,@StudName,@ChNo," & _
                    '                  "@Writting,@TotalValueIn,@UserName," & CDate(TransDate) & ")"
                    cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,ReceiptNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,ChNo," & _
                                      "Writting,TotalValueIn,UserName) " & _
                                      "Values (@MoveNo,@TransType,@PaymentType,@SNo,@ReceiptNo,@Source,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@StudID,@StudName,@ChNo," & _
                                      "@Writting,@TotalValueIn,@UserName )"

                    'Add values
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@TransType", "Receipt Voucher")
                    cmd.Parameters.AddWithValue("@PaymentType", PaymentType)
                    cmd.Parameters.AddWithValue("@SNo", SNo)
                    cmd.Parameters.AddWithValue("@ReceiptNo", Me.txtReceiptNo.Text.Trim)
                    cmd.Parameters.AddWithValue("@Source", "(" + Me.txtStdIndex.Text.Trim + ") " + Me.txtStdName.Text.Trim)
                    cmd.Parameters.AddWithValue("@Descr", row.Cells(4).Value)
                    cmd.Parameters.AddWithValue("@Acc1", row.Cells(0).Value)
                    cmd.Parameters.AddWithValue("@Acc2", row.Cells(1).Value)
                    cmd.Parameters.AddWithValue("@Acc3", row.Cells(2).Value)
                    cmd.Parameters.AddWithValue("@Acc4", row.Cells(3).Value)
                    cmd.Parameters.AddWithValue("@ChNo", Me.txtChNo.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                    cmd.Parameters.AddWithValue("@Writting", Me.txtWrittenValue.Text.Trim)
                    cmd.Parameters.AddWithValue("@TotalValueIn", CDbl(row.Cells(5).Value))
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.ExecuteNonQuery()
                Next


                'Debit Side
                'cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,ChNo," & _
                '           "Writting,TotalValueOut,UserName,TransDate) " & _
                '           "Values (@MoveNo,@TransType,@PaymentType,@SNo,@Source,N'Student Payment',@Acc1,@Acc2,@Acc3,@Acc4,@ChNo," & _
                '           "@Writting,@TotalValueOut,@UserName," & CDate(TransDate) & ")"
                '
                cmd.CommandText = "Insert Into Transactionees (MoveNo,TransType,PaymentType,SNo,Source,Descr,Acc1,Acc2,Acc3,Acc4,ChNo," & _
                          "Writting,TotalValueOut,UserName,StudID,StudName) " & _
                          "Values (@MoveNo,@TransType,@PaymentType,@SNo,@Source,N'Student Payment',@Acc1,@Acc2,@Acc3,@Acc4,@ChNo," & _
                          "@Writting,@TotalValueOut,@UserName,@StudID,@StudName)"
                'Add values
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@TransType", "Receipt Voucher")
                cmd.Parameters.AddWithValue("@PaymentType", PaymentType)
                cmd.Parameters.AddWithValue("@SNo", SNo)
                cmd.Parameters.AddWithValue("@Source", "(" + Me.txtStdIndex.Text.Trim + ") " + Me.txtStdName.Text.Trim)
                cmd.Parameters.AddWithValue("@Acc1", "Current Assets")
                cmd.Parameters.AddWithValue("@Acc2", "Cash & Banks")
                cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                If RCash.Checked = True Then 'Cash
                    cmd.Parameters.AddWithValue("@Acc3", "Cash")
                    cmd.Parameters.AddWithValue("@Acc4", "Cash on Hand")
                Else 'Bank
                    cmd.Parameters.AddWithValue("@Acc3", "Bank Accounts")
                    cmd.Parameters.AddWithValue("@Acc4", Me.CombBank.Text)
                End If
                cmd.Parameters.AddWithValue("@ChNo", Me.txtChNo.Text.Trim)
                cmd.Parameters.AddWithValue("@Writting", Me.txtWrittenValue.Text.Trim)
                cmd.Parameters.AddWithValue("@TotalValueOut", CDbl(Me.txtTotalAmount.Text.Trim))
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                MsgBox("Saved Successfully")


                PrintStudantReceipt("Receipt Voucher", PaymentType, SNo)
                PrintVoucher(MoveNo, (Me.DTPTrans.Value.Year))

                Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        SelStudID = ""

        Dim a As New frmSearchStudID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If

        Me.txtStdIndex.Text = SelStudID
        Me.txtStdName.Text = SelStudName
        Me.txtBalance.Text = CDbl(GetStudentBalance(Me.txtStdIndex.Text.Trim, Me.txtStdName.Text.Trim))

        'FillStudProgram()
    End Sub

    Private Sub GridVouchers_CellEndEdit(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridVouchers.CellEndEdit
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.GridVouchers.CurrentCell.Value = CDbl(Me.GridVouchers.CurrentCell.Value).ToString("N2")
            Calculate()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.GridVouchers.CurrentCell.Value = "0.00"
        End Try
    End Sub

    Private Sub txtBalance_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtBalance.TextChanged
        FillGrid()
    End Sub

    Public Sub PrintStudentStatement(ByVal StudID As String)
        'Try
        '    Dim dap As New SqlDataAdapter("Select StudentID,StudentName,dbo.GetStdProgram(StudentID) Acc1,Descr,BillNo,TotalIn,TotalOut,TransDate " & _
        '                                  "From Transactions Where StudentID=N'" & StudID & "' and Reversed=0", cnn)
        '    Dim das As New DataSet

        '    cnn.Open()
        '    dap.Fill(das, "Transactions")
        '    cnn.Close()
        Try
            Dim dap As New SqlDataAdapter("Select StudID,StudName,dbo.GetStdProgram(StudID) Acc1,Descr,SNo,TotalValueIn,TotalValueOut,TransDate " & _
                                          "From Transactionees Where StudID=N'" & StudID & "' and Reversed=0", cnn)
            Dim das As New DataSet3

            cnn.Open()
            dap.Fill(das, "Transactionees")

            Dim rpt As New StudentAccStatement

            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.CrystalReportViewer2.Zoom(100)
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Me.txtStdName.Text.Trim.Length = 0 Then
            Exit Sub
        Else
            Me.Cursor = Cursors.WaitCursor
            PrintStudentStatement(Me.txtStdIndex.Text)
            Me.Cursor = Cursors.Default
        End If
    End Sub
    'Sub FillStudProgram()
    '    Try
    '        Me.Cursor = Cursors.WaitCursor
    '        Dim cmd As New SqlCommand("Select Program From StudentsRegistration Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)
    '        Dim reader As SqlDataReader

    '        cnn.Open()
    '        reader = cmd.ExecuteReader
    '        While reader.Read
    '            Me.txtProgram.Text = reader.Item("Program")
    '        End While
    '        cnn.Close()

    '        Me.Cursor = Cursors.Default
    '    Catch ex As Exception
    '        Me.Cursor = Cursors.Default
    '        If cnn.State = ConnectionState.Open Then
    '            cnn.Close()
    '        End If
    '    End Try
    'End Sub

    Private Sub txtReceiptNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtReceiptNo.TextChanged
        ErrProv.Clear()
        If Me.txtReceiptNo.Text.Length = 0 Then
            Me.btnShowReceipt.Enabled = False
        End If
    End Sub

    Private Sub txtReceiptNo_Leave(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtReceiptNo.Leave
        If Me.txtReceiptNo.Text.Trim.Length > 0 Then
            If CheckReceiptNo(Me.txtReceiptNo.Text.Trim) = True Then
                Me.ErrProv.SetError(Me.txtReceiptNo, "Reciept No. already exists")
                Me.btnShowReceipt.Enabled = True
            Else
                Me.ErrProv.Clear()
            End If
        End If
    End Sub

    Private Sub btnShowReceipt_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnShowReceipt.Click
        'Try
        '    Dim dap As New SqlDataAdapter("Select * From Transactions Where ReceiptNo=" & Me.txtReceiptNo.Text.Trim, cnn)
        '    Dim das As New DataSet

        '    dap.Fill(das, "Transactions")
        Try
            Dim dap As New SqlDataAdapter("Select * From Transactionees Where ReceiptNo=" & Me.txtReceiptNo.Text.Trim, cnn)
            Dim das As New DataSet

            dap.Fill(das, "Transactionees")
            Dim rpt As New ReceiptVoucher
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()

        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub GridVouchers_CellContentClick(sender As System.Object, e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridVouchers.CellContentClick

    End Sub
End Class