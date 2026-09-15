Imports System.Data.SqlClient

Public Class frmBalancing
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents Button4 As System.Windows.Forms.Button
    Friend WithEvents txtMoveNo As System.Windows.Forms.TextBox
    Friend WithEvents RadioButton2 As System.Windows.Forms.RadioButton
    Friend WithEvents RadioButton1 As System.Windows.Forms.RadioButton
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents DataGridView1 As System.Windows.Forms.DataGridView
    Friend WithEvents DateTimePicker2 As System.Windows.Forms.DateTimePicker
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents Button2 As System.Windows.Forms.Button
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmBalancing))
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.DateTimePicker2 = New System.Windows.Forms.DateTimePicker
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.Label4 = New System.Windows.Forms.Label
        Me.Label5 = New System.Windows.Forms.Label
        Me.Button4 = New System.Windows.Forms.Button
        Me.txtMoveNo = New System.Windows.Forms.TextBox
        Me.RadioButton2 = New System.Windows.Forms.RadioButton
        Me.RadioButton1 = New System.Windows.Forms.RadioButton
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.Button2 = New System.Windows.Forms.Button
        Me.DataGridView1 = New System.Windows.Forms.DataGridView
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox1.SuspendLayout()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(237, 19)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 12
        Me.Button1.Text = "ÚÑÖ ÇáÞíæÏ"
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.DateTimePicker2)
        Me.GroupBox2.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox2.Controls.Add(Me.Label4)
        Me.GroupBox2.Controls.Add(Me.Label5)
        Me.GroupBox2.Location = New System.Drawing.Point(318, 8)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(496, 48)
        Me.GroupBox2.TabIndex = 11
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "ÇáÝÊÑÉ"
        '
        'DateTimePicker2
        '
        Me.DateTimePicker2.Location = New System.Drawing.Point(7, 16)
        Me.DateTimePicker2.Name = "DateTimePicker2"
        Me.DateTimePicker2.Size = New System.Drawing.Size(200, 20)
        Me.DateTimePicker2.TabIndex = 3
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(255, 16)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(200, 20)
        Me.DateTimePicker1.TabIndex = 2
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label4.Location = New System.Drawing.Point(213, 20)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(31, 13)
        Me.Label4.TabIndex = 1
        Me.Label4.Text = "Åáì :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Font = New System.Drawing.Font("Tahoma", 8.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label5.Location = New System.Drawing.Point(461, 20)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(28, 13)
        Me.Label5.TabIndex = 0
        Me.Label5.Text = "ãä :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Button4
        '
        Me.Button4.Enabled = False
        Me.Button4.Location = New System.Drawing.Point(574, 472)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(75, 32)
        Me.Button4.TabIndex = 21
        Me.Button4.Text = "ÊÑÕíÏ"
        '
        'txtMoveNo
        '
        Me.txtMoveNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtMoveNo.Location = New System.Drawing.Point(16, 18)
        Me.txtMoveNo.Name = "txtMoveNo"
        Me.txtMoveNo.ReadOnly = True
        Me.txtMoveNo.Size = New System.Drawing.Size(64, 20)
        Me.txtMoveNo.TabIndex = 49
        Me.txtMoveNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'RadioButton2
        '
        Me.RadioButton2.Location = New System.Drawing.Point(64, 48)
        Me.RadioButton2.Name = "RadioButton2"
        Me.RadioButton2.Size = New System.Drawing.Size(84, 24)
        Me.RadioButton2.TabIndex = 48
        Me.RadioButton2.Text = "ßá ÇáÞíæÏ"
        '
        'RadioButton1
        '
        Me.RadioButton1.Location = New System.Drawing.Point(80, 16)
        Me.RadioButton1.Name = "RadioButton1"
        Me.RadioButton1.Size = New System.Drawing.Size(68, 24)
        Me.RadioButton1.TabIndex = 47
        Me.RadioButton1.Text = "ÞíÏ ÑÞã :"
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.RadioButton1)
        Me.GroupBox1.Controls.Add(Me.txtMoveNo)
        Me.GroupBox1.Controls.Add(Me.RadioButton2)
        Me.GroupBox1.Location = New System.Drawing.Point(655, 424)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(159, 80)
        Me.GroupBox1.TabIndex = 51
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "ÊÑÕíÏ "
        '
        'Button2
        '
        Me.Button2.Enabled = False
        Me.Button2.Location = New System.Drawing.Point(574, 432)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 52
        Me.Button2.Text = "ÍÐÝ"
        '
        'DataGridView1
        '
        Me.DataGridView1.AllowUserToResizeRows = False
        Me.DataGridView1.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill
        Me.DataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.DataGridView1.Location = New System.Drawing.Point(10, 62)
        Me.DataGridView1.MultiSelect = False
        Me.DataGridView1.Name = "DataGridView1"
        Me.DataGridView1.Size = New System.Drawing.Size(804, 356)
        Me.DataGridView1.TabIndex = 53
        '
        'frmBalancing
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(824, 510)
        Me.Controls.Add(Me.DataGridView1)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.Button4)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox2)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(832, 544)
        Me.MinimumSize = New System.Drawing.Size(832, 544)
        Me.Name = "frmBalancing"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "ÊÑÕíÏ"
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub

#End Region


    Sub Fill()
        Try
            Dim dap As New SqlDataAdapter("Select MoveNo 'ÑÞã ÇáÞíÏ', TransType 'äæÚ ÇáÞíÏ', " & _
                                          "Package 'ÇáÍÒãÉ',Acc ' ',SubAcc '  ',TotalValueIn 'ÏÇÆä',TotalValueOut 'ãÏíä'," & _
                                          "TransDate 'ÇáÊÇÑíÎ' From Transactions where Done=0 " & _
                                          "And transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                                          "And transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'", cnn)
            Dim das As New DataSet

            cnn.Open()
            dap.Fill(das, "Transactions")
            Me.DataGridView1.DataSource = das
            Me.DataGridView1.DataMember = "Transactions"
            cnn.Close()
            Me.Button4.Enabled = True
        Catch ex As Exception
            MsgBox(ex.ToString)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub RadioButton1_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RadioButton1.CheckedChanged
        If Me.RadioButton1.Checked = True Then
            Me.txtMoveNo.Clear()
            Me.txtMoveNo.Enabled = True
            Me.Button2.Enabled = True
        ElseIf Me.RadioButton2.Checked = True Then
            Me.txtMoveNo.Clear()
            Me.txtMoveNo.Enabled = False
            Me.Button2.Enabled = False
        End If
    End Sub

    Private Sub RadioButton2_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RadioButton2.CheckedChanged
        If Me.RadioButton1.Checked = True Then
            Me.txtMoveNo.Clear()
            Me.txtMoveNo.Enabled = True
            Me.Button2.Enabled = True
        ElseIf Me.RadioButton2.Checked = True Then
            Me.txtMoveNo.Clear()
            Me.txtMoveNo.Enabled = False
            Me.Button2.Enabled = False
        End If
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.DateTimePicker1.Value > Me.DateTimePicker2.Value Then
            MsgBox("ÇáÑÌÇÁ ãÑÇÌÚÉ ÇáÊÇÑíÎ")
            Exit Sub
        Else
            Fill()
        End If
    End Sub

    Private Sub DataGrid1_CurrentCellChanged(ByVal sender As Object, ByVal e As System.EventArgs)
        Try
            Me.txtMoveNo.Text = CInt(Me.DataGridView1.SelectedRows.Item(0).Cells(0).Value)
        Catch ex As Exception
            Me.txtMoveNo.Clear()
        End Try
    End Sub

    Private Sub frmBalancing_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Me.RadioButton1.Checked = True
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Try
            Dim StrUpd As String
            If Me.RadioButton1.Checked = True Then
                If Len(Me.txtMoveNo.Text) = 0 Then
                    MsgBox("ÇáÑÌÇÁ ÅÏÎÇá ÑÞã ÇáÞíÏ")
                    Me.txtMoveNo.Focus()
                    Exit Sub
                Else
                    StrUpd = "Update Transactions Set Done=1 where MoveNo=" & Me.txtMoveNo.Text
                End If
            ElseIf Me.RadioButton2.Checked = True Then
                StrUpd = "Update Transactions Set Done=1 where " & _
                         "transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01' " & _
                         "And transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59'"
            End If

            If MsgBox("ÊÃßíÏ ÇáÊÑÕíÏ ¿", MsgBoxStyle.YesNoCancel) = MsgBoxResult.Yes Then
                Dim cmd As New SqlCommand(StrUpd, cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                MsgBox("Êã ÇáÊÑÕíÏ")
                Me.txtMoveNo.Clear()
                Fill()
            End If
        Catch ex As Exception
            MsgBox(ex.ToString)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        If Len(Me.txtMoveNo.Text) = 0 Then
            MsgBox("ÇáÑÌÇÁ ÅÏÎÇá ÑÞã ÇáÞíÏ")
            Me.txtMoveNo.Focus()
            Exit Sub
        Else
            Try
                If MsgBox("ÊÃßíÏ ÇáÍÐÝ ¿", MsgBoxStyle.YesNoCancel) = MsgBoxResult.Yes Then
                    Dim cmd As New SqlCommand("Delete from Transactions where MoveNo=" & Me.txtMoveNo.Text, cnn)
                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    MsgBox("Êã ÇáÍÐÝ")
                    Me.txtMoveNo.Clear()
                    Fill()
                End If
            Catch ex As Exception
                MsgBox(ex.ToString)
                Try
                    cnn.Close()
                Catch

                End Try
            End Try
        End If
    End Sub

    Private Sub txtMoveNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtMoveNo.TextChanged
        If Me.txtMoveNo.Text = "0" Then
            Me.txtMoveNo.Clear()
        End If
    End Sub

    Private Sub DataGridView1_SelectionChanged(ByVal sender As Object, ByVal e As System.EventArgs) Handles DataGridView1.SelectionChanged
        Try
            Me.txtMoveNo.Text = CInt(Me.DataGridView1.SelectedRows.Item(0).Cells(0).Value)
        Catch ex As Exception
            Me.txtMoveNo.Clear()
        End Try
    End Sub
End Class
